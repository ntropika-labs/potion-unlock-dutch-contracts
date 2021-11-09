const { expect } = require("chai");
const { ethers } = require("hardhat");
const { before } = require("mocha");
const { formatUnits } = require("ethers/lib/utils");
const { send } = require("process");

async function epochNow() {
    return (await ethers.provider.getBlock("latest")).timestamp;
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getEventTimestamp(eventName, tx) {
    const receipt = await tx.wait();

    const events = receipt.events?.filter(x => {
        return x.event === eventName;
    });

    expect(events.length).to.be.greaterThanOrEqual(1);

    const batchStartedEvent = events[0];
    const eventBlock = await batchStartedEvent.getBlock();
    return eventBlock.timestamp;
}

async function fastForwardChain(seconds) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
}

function fromBN(bn) {
    return Number(formatUnits(bn, "wei"));
}

function getBidderAddress(bidderNumber) {
    //return ethers.Wallet.createRandom().address;
    return "0x" + bidderNumber.toString().padStart(40, "0");
}

const FIRST_TOKEN_ID = 1;

describe("NFTPotionAuction", function () {
    describe("Default Values", function () {
        it("All default values", async function () {
            const NFTPotionAuction = await ethers.getContractFactory("NFTPotionAuction");
            const auction = await NFTPotionAuction.deploy();
            await auction.deployed();

            expect(await auction.nextFreeTokenId()).to.equal(1);
        });
    });

    describe("Basic sanity checks for starting an auction", async function () {
        var auctionContract;

        before("Deploy NFT Auction", async function () {
            const NFTPotionAuction = await ethers.getContractFactory("NFTPotionAuction");
            auctionContract = await NFTPotionAuction.deploy();
            await auctionContract.deployed();
        });

        it("Can't start auction in the past", async function () {
            const auctionEndDatePast = (await epochNow()) - 100;

            const minimumPricePerToken = 10;
            const directPurchasePrice = 100;

            await expect(
                auctionContract.startBatch(
                    FIRST_TOKEN_ID,
                    FIRST_TOKEN_ID + 10,
                    minimumPricePerToken,
                    directPurchasePrice,
                    auctionEndDatePast,
                ),
            ).to.be.revertedWith("Auction is in the past");
        });
        it("Can't start first auction with token ID different than 1", async function () {
            const minimumPricePerToken = 10;
            const directPurchasePrice = 100;
            const auctionEndDate = (await epochNow()) + 2000;

            await expect(
                auctionContract.startBatch(
                    0,
                    FIRST_TOKEN_ID + 10,
                    minimumPricePerToken,
                    directPurchasePrice,
                    auctionEndDate,
                ),
            ).to.be.revertedWith("Wrong start token ID");
            await expect(
                auctionContract.startBatch(
                    2,
                    FIRST_TOKEN_ID + 10,
                    minimumPricePerToken,
                    directPurchasePrice,
                    auctionEndDate,
                ),
            ).to.be.revertedWith("Wrong start token ID");
            await expect(
                auctionContract.startBatch(
                    1231928931,
                    FIRST_TOKEN_ID + 10,
                    minimumPricePerToken,
                    directPurchasePrice,
                    auctionEndDate,
                ),
            ).to.be.revertedWith("Wrong start token ID");
        });
        it("Minimum price cannot be greater than purchase price", async function () {
            const auctionEndDate = (await epochNow()) + 2000;

            await expect(
                auctionContract.startBatch(FIRST_TOKEN_ID, FIRST_TOKEN_ID + 10, 1, 0, auctionEndDate),
            ).to.be.revertedWith("Minimum higher than purchase price");
            await expect(
                auctionContract.startBatch(FIRST_TOKEN_ID, FIRST_TOKEN_ID + 10, 2, 1, auctionEndDate),
            ).to.be.revertedWith("Minimum higher than purchase price");
            await expect(
                auctionContract.startBatch(FIRST_TOKEN_ID, FIRST_TOKEN_ID + 10, 123123, 123, auctionEndDate),
            ).to.be.revertedWith("Minimum higher than purchase price");
        });
        it("Start first batch auction (Token IDs 1-20)", async function () {
            const auctionEndDate = (await epochNow()) + 2000;

            const tx = await auctionContract.startBatch(1, 20, 100, 1200, auctionEndDate);
            const blockTimestamp = await getEventTimestamp("BatchStarted", tx);

            await expect(tx)
                .to.emit(auctionContract, "BatchStarted")
                .withArgs(1, blockTimestamp, 1, 20, 100, 1200, auctionEndDate);
        });
        it("Can't start new batch without ending previous", async function () {
            const auctionEndDate = (await epochNow()) + 2000;
            await expect(auctionContract.startBatch(1, 20, 100, 1200, auctionEndDate)).to.be.revertedWith(
                "Auction still active",
            );
        });
    });

    describe("Batch auction start/end with no bids", async function () {
        const AUCTION_DURATION = 2000;
        var auctionContract;
        var auctionEndDate;

        before("Deploy NFT Auction", async function () {
            const NFTPotionAuction = await ethers.getContractFactory("NFTPotionAuction");
            auctionContract = await NFTPotionAuction.deploy();
            await auctionContract.deployed();
        });

        it("Start first batch auction (Token IDs 1-20)", async function () {
            auctionEndDate = (await epochNow()) + AUCTION_DURATION;

            const tx = await auctionContract.startBatch(1, 20, 100, 1200, auctionEndDate);
            const blockTimestamp = await getEventTimestamp("BatchStarted", tx);

            await expect(tx)
                .to.emit(auctionContract, "BatchStarted")
                .withArgs(1, blockTimestamp, 1, 20, 100, 1200, auctionEndDate);
        });
        it("End batch with no bids", async function () {
            await fastForwardChain(2000);
            const tx = await auctionContract.endBatch(100);
            const blockTimestamp = await getEventTimestamp("BatchEnded", tx);

            await expect(tx).to.emit(auctionContract, "BatchEnded").withArgs(1, auctionEndDate, blockTimestamp, 0);
        });
    });

    describe("Batch auction start/end with 1 bid", async function () {
        const AUCTION_DURATION = 2000;
        const MINIMUM_PRICE = 10;
        const PURCHASE_PRICE = 100;
        const NUM_TOKENS = 5;

        var auctionContract;
        var auctionEndDate;

        before("Deploy NFT Auction", async function () {
            const NFTPotionAuction = await ethers.getContractFactory("NFTPotionAuction");
            auctionContract = await NFTPotionAuction.deploy();
            await auctionContract.deployed();
        });

        it("Start first batch auction (Token IDs 1-20)", async function () {
            auctionEndDate = (await epochNow()) + AUCTION_DURATION;

            const tx = await auctionContract.startBatch(1, 20, MINIMUM_PRICE, PURCHASE_PRICE, auctionEndDate);
            const blockTimestamp = await getEventTimestamp("BatchStarted", tx);

            await expect(tx)
                .to.emit(auctionContract, "BatchStarted")
                .withArgs(1, blockTimestamp, 1, 20, MINIMUM_PRICE, PURCHASE_PRICE, auctionEndDate);
        });
        it("Can't set bid below minimum price", async function () {
            await expect(auctionContract.setBid(NUM_TOKENS, MINIMUM_PRICE - 1, 0)).to.be.revertedWith(
                "Bid must reach minimum amount",
            );
        });
        it("Can't set bid equal or greater than purchase price", async function () {
            await expect(auctionContract.setBid(NUM_TOKENS, PURCHASE_PRICE, 0)).to.be.revertedWith(
                "Bid cannot be higher than direct price",
            );
            await expect(auctionContract.setBid(NUM_TOKENS, PURCHASE_PRICE + 1, 0)).to.be.revertedWith(
                "Bid cannot be higher than direct price",
            );
            await expect(auctionContract.setBid(NUM_TOKENS, PURCHASE_PRICE + 100, 0)).to.be.revertedWith(
                "Bid cannot be higher than direct price",
            );
        });
        it("Set 1 bid at minimum price", async function () {
            const sender = await ethers.provider.getSigner().getAddress();

            await expect(auctionContract.setBid(NUM_TOKENS, MINIMUM_PRICE, 0, { value: 5 * MINIMUM_PRICE }))
                .to.emit(auctionContract, "SetBid")
                .withArgs(1, sender, NUM_TOKENS, MINIMUM_PRICE);
        });
        it("End batch with 1 bid", async function () {
            const sender = await ethers.provider.getSigner().getAddress();

            await fastForwardChain(2000);
            const tx = await auctionContract.endBatch(100);
            const blockTimestamp = await getEventTimestamp("BatchEnded", tx);

            await expect(tx)
                .to.emit(auctionContract, "BatchEnded")
                .withArgs(1, auctionEndDate, blockTimestamp, NUM_TOKENS);

            // No ranges assigned yet
            let ranges = await auctionContract.getWhitelistRanges(sender);
            expect(ranges.length).to.be.equal(0);

            // Claim Token IDs
            await auctionContract.claimTokenIds(1, true);

            // Ranges are now assigned
            ranges = await auctionContract.getWhitelistRanges(sender);

            expect(ranges.length).to.be.equal(1);
            expect(fromBN(ranges[0].firstId)).to.be.equal(1);
            expect(fromBN(ranges[0].lastId)).to.be.equal(NUM_TOKENS);
        });
    });
    describe("Batch auction start/end with 20 bids", async function () {
        const AUCTION_DURATION = 2000;
        const MINIMUM_PRICE = 10;
        const PURCHASE_PRICE = 100;

        var auctionContract;
        var auctionEndDate;

        before("Deploy NFT Auction", async function () {
            const NFTPotionAuction = await ethers.getContractFactory("NFTPotionAuction");
            auctionContract = await NFTPotionAuction.deploy();
            await auctionContract.deployed();
        });

        it("Start first batch auction (Token IDs 1-20)", async function () {
            auctionEndDate = (await epochNow()) + AUCTION_DURATION;

            const tx = await auctionContract.startBatch(1, 20, MINIMUM_PRICE, PURCHASE_PRICE, auctionEndDate);
            const blockTimestamp = await getEventTimestamp("BatchStarted", tx);

            await expect(tx)
                .to.emit(auctionContract, "BatchStarted")
                .withArgs(1, blockTimestamp, 1, 20, MINIMUM_PRICE, PURCHASE_PRICE, auctionEndDate);
        });
        it("Set 20 bids at different prices", async function () {
            const senders = await ethers.getSigners();

            for (let i = 0; i < senders.length; ++i) {
                const numTokens = 1;
                const pricePerToken = MINIMUM_PRICE + i;
                const priceToPay = numTokens * pricePerToken;

                const senderAddress = await senders[i].getAddress();

                const prevBid = await auctionContract.getPreviousBid(1, numTokens, pricePerToken);

                await expect(
                    auctionContract
                        .connect(senders[i])
                        .setBid(numTokens, pricePerToken, prevBid, { value: priceToPay }),
                )
                    .to.emit(auctionContract, "SetBid")
                    .withArgs(1, senderAddress, numTokens, pricePerToken);
            }
        });
        it("End batch with 20 bids", async function () {
            const senders = await ethers.getSigners();

            await fastForwardChain(2000);
            const tx = await auctionContract.endBatch(100);
            const blockTimestamp = await getEventTimestamp("BatchEnded", tx);

            await expect(tx).to.emit(auctionContract, "BatchEnded").withArgs(1, auctionEndDate, blockTimestamp, 20);

            // Ranges are not assigned yet
            for (let i = 0; i < senders.length; ++i) {
                const senderAddress = await senders[i].getAddress();

                const ranges = await auctionContract.getWhitelistRanges(senderAddress);
                expect(ranges.length).to.be.equal(0);
            }

            // Claim Token IDs
            for (let i = 0; i < senders.length; ++i) {
                await auctionContract.connect(senders[i]).claimTokenIds(1, true);
            }

            // Ranges must be assigned now
            for (let i = 0; i < senders.length; ++i) {
                const senderAddress = await senders[i].getAddress();

                const ranges = await auctionContract.getWhitelistRanges(senderAddress);

                expect(ranges.length).to.be.equal(1);

                expect(fromBN(ranges[0].firstId)).to.be.equal(i + 1);
                expect(fromBN(ranges[0].lastId)).to.be.equal(i + 1);
            }
        });
    });
    describe("Bids at the same price", async function () {
        const AUCTION_DURATION = 2000;
        const MINIMUM_PRICE = 10;
        const PURCHASE_PRICE = 10000;
        const START_TOKEN_ID = 1;
        const END_TOKEN_ID = 100;
        const TOKENS_PER_BIDDER = 5;
        const NUM_BIDDERS = 40;

        var auctionContract;
        var auctionEndDate;

        before("Deploy NFT Auction", async function () {
            const NFTPotionAuction = await ethers.getContractFactory("NFTPotionAuction");
            auctionContract = await NFTPotionAuction.deploy();
            await auctionContract.deployed();
        });

        it("Start batch auction", async function () {
            auctionEndDate = (await epochNow()) + AUCTION_DURATION;

            const tx = await auctionContract.startBatch(
                START_TOKEN_ID,
                END_TOKEN_ID,
                MINIMUM_PRICE,
                PURCHASE_PRICE,
                auctionEndDate,
            );
            const blockTimestamp = await getEventTimestamp("BatchStarted", tx);

            await expect(tx)
                .to.emit(auctionContract, "BatchStarted")
                .withArgs(
                    1,
                    blockTimestamp,
                    START_TOKEN_ID,
                    END_TOKEN_ID,
                    MINIMUM_PRICE,
                    PURCHASE_PRICE,
                    auctionEndDate,
                );

            const batch = await auctionContract.getCurrentBatch();

            expect(batch.minimumPricePerToken).to.be.equal(MINIMUM_PRICE);
            expect(batch.directPurchasePrice).to.be.equal(PURCHASE_PRICE);
            expect(batch.startTokenId).to.be.equal(START_TOKEN_ID);
            expect(batch.numTokensAuctioned).to.be.equal(END_TOKEN_ID - START_TOKEN_ID + 1);
            expect(batch.auctionEndDate).to.be.equal(auctionEndDate);
            expect(batch.clearingPrice).to.be.equal(0);
            expect(batch.clearingBidId).to.be.equal(0);
            expect(batch.lastBidderNumAssignedTokens).to.be.equal(0);
            expect(batch.numTokensSold).to.be.equal(0);
            expect(batch.numTokensClaimed).to.be.equal(0);
        });
        it("Set bids at the same price", async function () {
            for (let i = 0; i < NUM_BIDDERS; ++i) {
                const pricePerToken = MINIMUM_PRICE + 100;
                const priceToPay = TOKENS_PER_BIDDER * pricePerToken;

                const bidderAddress = "0x" + (i + 1).toString().padStart(40, "0");

                const prevBid = await auctionContract.getPreviousBid(1, TOKENS_PER_BIDDER, pricePerToken);

                await expect(
                    auctionContract.setBidOnBehalf(bidderAddress, TOKENS_PER_BIDDER, pricePerToken, prevBid, {
                        value: priceToPay,
                    }),
                )
                    .to.emit(auctionContract, "SetBid")
                    .withArgs(1, bidderAddress, TOKENS_PER_BIDDER, pricePerToken);
            }
        });
        it("End batch and claim token IDs", async function () {
            await fastForwardChain(2000);
            const tx = await auctionContract.endBatch(NUM_BIDDERS);
            const blockTimestamp = await getEventTimestamp("BatchEnded", tx);

            await expect(tx)
                .to.emit(auctionContract, "BatchEnded")
                .withArgs(1, auctionEndDate, blockTimestamp, END_TOKEN_ID - START_TOKEN_ID + 1);

            // Ranges are not assigned yet
            for (let i = 0; i < NUM_BIDDERS; ++i) {
                const bidderAddress = "0x" + (i + 1).toString().padStart(40, "0");

                const ranges = await auctionContract.getWhitelistRanges(bidderAddress);
                expect(ranges.length).to.be.equal(0);
            }

            // Claim Token IDs
            for (let i = 0; i < NUM_BIDDERS; ++i) {
                const bidderAddress = "0x" + (i + 1).toString().padStart(40, "0");
                await auctionContract.claimTokenIdsOnBehalf(1, bidderAddress, true);
            }

            // First half of bidders got their token IDs
            for (let i = 0; i < NUM_BIDDERS / 2; ++i) {
                const bidderAddress = "0x" + (i + 1).toString().padStart(40, "0");

                const ranges = await auctionContract.getWhitelistRanges(bidderAddress);

                expect(ranges.length).to.be.equal(1);

                expect(fromBN(ranges[0].firstId)).to.be.equal(i * TOKENS_PER_BIDDER + 1);
                expect(fromBN(ranges[0].lastId)).to.be.equal((i + 1) * TOKENS_PER_BIDDER);
            }
            // First half of bidders got their token IDs
            for (let i = NUM_BIDDERS / 2; i < NUM_BIDDERS; ++i) {
                const bidderAddress = "0x" + (i + 1).toString().padStart(40, "0");

                const ranges = await auctionContract.getWhitelistRanges(bidderAddress);
                expect(ranges.length).to.be.equal(0);
            }
        });
    });

    describe("Next bid is cancelled before new bid can be added", async function () {
        const AUCTION_DURATION = 2000;
        const MINIMUM_PRICE = 10;
        const PURCHASE_PRICE = 10000;
        const START_TOKEN_ID = 1;
        const END_TOKEN_ID = 95;
        const TOKENS_PER_BIDDER = 5;

        var auctionContract;
        var auctionEndDate;

        before("Deploy NFT Auction", async function () {
            const NFTPotionAuction = await ethers.getContractFactory("NFTPotionAuction");
            auctionContract = await NFTPotionAuction.deploy();
            await auctionContract.deployed();
        });

        it("Start batch auction", async function () {
            auctionEndDate = (await epochNow()) + AUCTION_DURATION;

            const tx = await auctionContract.startBatch(
                START_TOKEN_ID,
                END_TOKEN_ID,
                MINIMUM_PRICE,
                PURCHASE_PRICE,
                auctionEndDate,
            );
            const blockTimestamp = await getEventTimestamp("BatchStarted", tx);

            await expect(tx)
                .to.emit(auctionContract, "BatchStarted")
                .withArgs(
                    1,
                    blockTimestamp,
                    START_TOKEN_ID,
                    END_TOKEN_ID,
                    MINIMUM_PRICE,
                    PURCHASE_PRICE,
                    auctionEndDate,
                );

            const batch = await auctionContract.getCurrentBatch();

            expect(batch.minimumPricePerToken).to.be.equal(MINIMUM_PRICE);
            expect(batch.directPurchasePrice).to.be.equal(PURCHASE_PRICE);
            expect(batch.startTokenId).to.be.equal(START_TOKEN_ID);
            expect(batch.numTokensAuctioned).to.be.equal(END_TOKEN_ID - START_TOKEN_ID + 1);
            expect(batch.auctionEndDate).to.be.equal(auctionEndDate);
            expect(batch.clearingPrice).to.be.equal(0);
            expect(batch.clearingBidId).to.be.equal(0);
            expect(batch.lastBidderNumAssignedTokens).to.be.equal(0);
            expect(batch.numTokensSold).to.be.equal(0);
            expect(batch.numTokensClaimed).to.be.equal(0);
        });
        it("Set bids at different prices", async function () {
            const senders = await ethers.getSigners();

            for (let i = 0; i < senders.length - 1; ++i) {
                const pricePerToken = MINIMUM_PRICE + 5 * i;
                const priceToPay = TOKENS_PER_BIDDER * pricePerToken;

                const senderAddress = await senders[i].getAddress();

                const prevBid = await auctionContract.getPreviousBid(1, TOKENS_PER_BIDDER, pricePerToken);

                await expect(
                    auctionContract
                        .connect(senders[i])
                        .setBid(TOKENS_PER_BIDDER, pricePerToken, prevBid, { value: priceToPay }),
                )
                    .to.emit(auctionContract, "SetBid")
                    .withArgs(1, senderAddress, TOKENS_PER_BIDDER, pricePerToken);
            }
        });
        it("Cancel bid between getting next node and adding new bid", async function () {
            const senders = await ethers.getSigners();

            // Price sits between 50 and 55, so the bidder 10 and bidder 11
            const pricePerToken = MINIMUM_PRICE + 5 * 10 + 2;
            const priceToPay = TOKENS_PER_BIDDER * pricePerToken;

            let prevBid = await auctionContract.getPreviousBid(1, TOKENS_PER_BIDDER, pricePerToken);

            // Cancel bids for bidder 10 and bidder 11
            let tx = await auctionContract.connect(senders[10]).cancelBid(1, true);

            let blockTimestamp = await getEventTimestamp("CancelBid", tx);

            await expect(tx)
                .to.emit(auctionContract, "CancelBid")
                .withArgs(1, senders[10].address, blockTimestamp, auctionEndDate);

            tx = await auctionContract.connect(senders[11]).cancelBid(1, true);

            blockTimestamp = await getEventTimestamp("CancelBid", tx);

            await expect(tx)
                .to.emit(auctionContract, "CancelBid")
                .withArgs(1, senders[11].address, blockTimestamp, auctionEndDate);

            // Set the bid now
            await expect(
                auctionContract.connect(senders[senders.length - 1]).setBid(TOKENS_PER_BIDDER, pricePerToken, prevBid, {
                    value: priceToPay,
                }),
            )
                .to.emit(auctionContract, "SetBid")
                .withArgs(1, senders[senders.length - 1].address, TOKENS_PER_BIDDER, pricePerToken);

            // Retry
            prevBid = await auctionContract.getPreviousBid(1, TOKENS_PER_BIDDER, pricePerToken);

            await expect(
                auctionContract
                    .connect(senders[senders.length - 1])
                    .setBid(TOKENS_PER_BIDDER, pricePerToken, prevBid, { value: priceToPay }),
            )
                .to.emit(auctionContract, "SetBid")
                .withArgs(1, senders[senders.length - 1].address, TOKENS_PER_BIDDER, pricePerToken);
        });
        it("End batch and claim token IDs", async function () {
            const senders = await ethers.getSigners();

            await fastForwardChain(2000);
            const tx = await auctionContract.endBatch(senders.length);
            const blockTimestamp = await getEventTimestamp("BatchEnded", tx);

            await expect(tx)
                .to.emit(auctionContract, "BatchEnded")
                .withArgs(1, auctionEndDate, blockTimestamp, (senders.length - 2) * TOKENS_PER_BIDDER);

            // Ranges are not assigned yet
            for (let i = 0; i < senders.length; ++i) {
                const ranges = await auctionContract.getWhitelistRanges(senders[i].address);
                expect(ranges.length).to.be.equal(0);
            }

            // Claim Token IDs
            for (let i = 0; i < senders.length; ++i) {
                if (i === 10 || i === 11) {
                    await expect(auctionContract.connect(senders[i]).claimTokenIds(1, true)).to.be.revertedWith(
                        "Bidder has no claimable bid",
                    );
                } else {
                    await auctionContract.connect(senders[i]).claimTokenIds(1, true);
                }
            }

            // All got tokens except 10 and 11
            for (let i = 0; i < senders.length; ++i) {
                const ranges = await auctionContract.getWhitelistRanges(senders[i].address);
                if (i === 10 || i === 11) {
                    expect(ranges.length).to.be.equal(0);
                } else if (i < 10) {
                    expect(ranges.length).to.be.equal(1);

                    expect(fromBN(ranges[0].firstId)).to.be.equal(i * TOKENS_PER_BIDDER + 1);
                    expect(fromBN(ranges[0].lastId)).to.be.equal((i + 1) * TOKENS_PER_BIDDER);
                } else {
                    expect(ranges.length).to.be.equal(1);

                    expect(fromBN(ranges[0].firstId)).to.be.equal((i - 2) * TOKENS_PER_BIDDER + 1);
                    expect(fromBN(ranges[0].lastId)).to.be.equal((i - 2 + 1) * TOKENS_PER_BIDDER);
                }
            }
        });
    });

    describe("Batch auction start/end with 200 bids", async function () {
        const AUCTION_DURATION = 2000;
        const MINIMUM_PRICE = 10;
        const PURCHASE_PRICE = 10000;
        const START_TOKEN_ID = 1;
        const END_TOKEN_ID = 5000;
        const TOKENS_PER_BIDDER = 5;
        const NUM_BIDDERS = 200;

        var auctionContract;
        var auctionEndDate;

        before("Deploy NFT Auction", async function () {
            const NFTPotionAuction = await ethers.getContractFactory("NFTPotionAuction");
            auctionContract = await NFTPotionAuction.deploy();
            await auctionContract.deployed();
        });

        it("Start batch auction", async function () {
            auctionEndDate = (await epochNow()) + AUCTION_DURATION;

            const tx = await auctionContract.startBatch(
                START_TOKEN_ID,
                END_TOKEN_ID,
                MINIMUM_PRICE,
                PURCHASE_PRICE,
                auctionEndDate,
            );
            const blockTimestamp = await getEventTimestamp("BatchStarted", tx);

            await expect(tx)
                .to.emit(auctionContract, "BatchStarted")
                .withArgs(
                    1,
                    blockTimestamp,
                    START_TOKEN_ID,
                    END_TOKEN_ID,
                    MINIMUM_PRICE,
                    PURCHASE_PRICE,
                    auctionEndDate,
                );
        });
        it("Set bids at different prices", async function () {
            for (let i = 0; i < NUM_BIDDERS; ++i) {
                const pricePerToken = MINIMUM_PRICE + i;
                const priceToPay = TOKENS_PER_BIDDER * pricePerToken;

                const bidderAddress = "0x" + (i + 1).toString().padStart(40, "0");

                const prevBid = await auctionContract.getPreviousBid(1, TOKENS_PER_BIDDER, pricePerToken);

                await expect(
                    auctionContract.setBidOnBehalf(bidderAddress, TOKENS_PER_BIDDER, pricePerToken, prevBid, {
                        value: priceToPay,
                    }),
                )
                    .to.emit(auctionContract, "SetBid")
                    .withArgs(1, bidderAddress, TOKENS_PER_BIDDER, pricePerToken);
            }
        }).timeout(500000);
        it("End batch and claim token IDs", async function () {
            await fastForwardChain(2000);
            const tx = await auctionContract.endBatch(NUM_BIDDERS);
            const blockTimestamp = await getEventTimestamp("BatchEnded", tx);

            await expect(tx)
                .to.emit(auctionContract, "BatchEnded")
                .withArgs(1, auctionEndDate, blockTimestamp, NUM_BIDDERS * TOKENS_PER_BIDDER);

            // Ranges are not assigned yet
            for (let i = 0; i < NUM_BIDDERS; ++i) {
                const bidderAddress = "0x" + (i + 1).toString().padStart(40, "0");

                const ranges = await auctionContract.getWhitelistRanges(bidderAddress);
                expect(ranges.length).to.be.equal(0);
            }

            // Claim Token IDs
            for (let i = 0; i < NUM_BIDDERS; ++i) {
                const bidderAddress = "0x" + (i + 1).toString().padStart(40, "0");
                await auctionContract.claimTokenIdsOnBehalf(1, bidderAddress, true);
            }

            // Ranges must be assigned now
            for (let i = 0; i < NUM_BIDDERS; ++i) {
                const bidderAddress = "0x" + (i + 1).toString().padStart(40, "0");

                const ranges = await auctionContract.getWhitelistRanges(bidderAddress);

                expect(ranges.length).to.be.equal(1);

                expect(fromBN(ranges[0].firstId)).to.be.equal(i * TOKENS_PER_BIDDER + 1);
                expect(fromBN(ranges[0].lastId)).to.be.equal((i + 1) * TOKENS_PER_BIDDER);
            }
        });
    });
});

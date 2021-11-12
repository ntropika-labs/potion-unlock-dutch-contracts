const { expect } = require("chai");
const { ethers } = require("hardhat");
const { generatePrice } = require("./NFTPotionAuctionUtils");

const { NFTPotionAuctionHelper } = require("./NFTPotionAuctionHelper");

describe("NFTPotionAuction", function () {
    describe("Edge Cases", function () {
        let auction;

        // Initialize the contract
        beforeEach(async function () {
            auction = new NFTPotionAuctionHelper();
            await auction.initialize();
        });

        /**
         * Rebidding
         */
        describe("Rebidding", function () {
            it("With same number of tokens, different price", async function () {
                const NUM_BIDDERS = 20;
                const START_TOKEN_ID = 1;
                const END_TOKEN_ID = 100;
                const MINIMUM_PRICE = 340;
                const PURCHASE_PRICE = 1238723;

                const signers = await ethers.getSigners();

                await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, 2000);

                for (let i = 0; i < NUM_BIDDERS; i++) {
                    await auction.setBid(i + 1, MINIMUM_PRICE + i * 5, signers[i]);
                }
                for (let i = 0; i < NUM_BIDDERS; i++) {
                    await auction.setBid(i + 1, MINIMUM_PRICE + i * 6, signers[i]);
                }

                await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);
            });

            it("With different number of tokens, same price", async function () {
                const NUM_BIDDERS = 20;
                const START_TOKEN_ID = 1;
                const END_TOKEN_ID = 100;
                const MINIMUM_PRICE = 340;
                const PURCHASE_PRICE = 1238723;

                const signers = await ethers.getSigners();

                await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, 2000);

                for (let i = 0; i < NUM_BIDDERS; i++) {
                    await auction.setBid(i + 1, MINIMUM_PRICE + i * 5, signers[i]);
                }
                for (let i = 0; i < NUM_BIDDERS; i++) {
                    await auction.setBid(i + 2, MINIMUM_PRICE + i * 5, signers[i]);
                }

                await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);
            });
        });

        /**
         * Purchase
         */
        describe("Purchase", function () {
            it("1 Batch, 600 tokens, 6 purchasers buy all tokens", async function () {
                const NUM_BIDDERS = 6;
                const START_TOKEN_ID = 1;
                const END_TOKEN_ID = 600;
                const MINIMUM_PRICE = 340;
                const PURCHASE_PRICE = 1238;

                const signers = await ethers.getSigners();

                await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, 2000);

                for (let i = 0; i < NUM_BIDDERS; i++) {
                    await auction.purchase((END_TOKEN_ID - START_TOKEN_ID + 1) / NUM_BIDDERS, signers[i]);
                }

                await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);
            });
            it("3 Batches, 1440,4624,10350 tokens, several purchasers buy all tokens", async function () {
                const batches = [
                    {
                        NUM_BIDDERS: 20,
                        START_TOKEN_ID: 1,
                        END_TOKEN_ID: 1440,
                        MINIMUM_PRICE: 200,
                        PURCHASE_PRICE: 400,
                    },
                    {
                        NUM_BIDDERS: 34,
                        START_TOKEN_ID: 1,
                        END_TOKEN_ID: 4624,
                        MINIMUM_PRICE: 1,
                        PURCHASE_PRICE: 2,
                    },
                    {
                        NUM_BIDDERS: 15,
                        START_TOKEN_ID: 1,
                        END_TOKEN_ID: 10350,
                        MINIMUM_PRICE: 1,
                        PURCHASE_PRICE: 5000,
                    },
                ];

                let baseTokenId = 0;

                for (let i = 0; i < batches.length; i++) {
                    const START_TOKEN_ID = baseTokenId + batches[i].START_TOKEN_ID;
                    const END_TOKEN_ID = baseTokenId + batches[i].END_TOKEN_ID;

                    const signers = await ethers.getSigners();

                    await auction.startBatch(
                        START_TOKEN_ID,
                        END_TOKEN_ID,
                        batches[i].MINIMUM_PRICE,
                        batches[i].PURCHASE_PRICE,
                        2000,
                    );

                    for (let j = 0; j < batches[i].NUM_BIDDERS; j++) {
                        await auction.purchase(
                            (END_TOKEN_ID - START_TOKEN_ID + 1) / batches[i].NUM_BIDDERS,
                            signers[j],
                        );
                    }

                    await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);

                    baseTokenId += auction.currentBatch.numTokensSold;

                    for (let j = 0; j < batches[i].NUM_BIDDERS; j++) {
                        await auction.claimRefund(signers[j]);
                    }
                }
            });
            it("3 Batches, 1440,4624,10350 tokens, 1 purchaser buy all tokens", async function () {
                const batches = [
                    {
                        NUM_BIDDERS: 20,
                        START_TOKEN_ID: 1,
                        END_TOKEN_ID: 1440,
                        MINIMUM_PRICE: 200,
                        PURCHASE_PRICE: 400,
                    },
                    {
                        NUM_BIDDERS: 34,
                        START_TOKEN_ID: 1,
                        END_TOKEN_ID: 4624,
                        MINIMUM_PRICE: 1,
                        PURCHASE_PRICE: 2,
                    },
                    {
                        NUM_BIDDERS: 15,
                        START_TOKEN_ID: 1,
                        END_TOKEN_ID: 10350,
                        MINIMUM_PRICE: 1,
                        PURCHASE_PRICE: 5000,
                    },
                ];

                let baseTokenId = 0;

                for (let i = 0; i < batches.length; i++) {
                    const START_TOKEN_ID = baseTokenId + batches[i].START_TOKEN_ID;
                    const END_TOKEN_ID = baseTokenId + batches[i].END_TOKEN_ID;

                    const signers = await ethers.getSigners();

                    await auction.startBatch(
                        START_TOKEN_ID,
                        END_TOKEN_ID,
                        batches[i].MINIMUM_PRICE,
                        batches[i].PURCHASE_PRICE,
                        2000,
                    );

                    await auction.purchase(END_TOKEN_ID - START_TOKEN_ID + 1, signers[2]);

                    await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);

                    baseTokenId += auction.currentBatch.numTokensSold;

                    for (let j = 0; j < batches[i].NUM_BIDDERS; j++) {
                        await auction.claimRefund(signers[j]);
                    }
                }
            });
        });
        /**
         * Misc
         */
        describe("Misc", function () {
            it("Calling transferFunds before bidders have claimed their tokens", async function () {
                const NUM_BIDDERS = 20;
                const START_TOKEN_ID = 1;
                const END_TOKEN_ID = 100;
                const MINIMUM_PRICE = 340;
                const PURCHASE_PRICE = 324234;

                const signers = await ethers.getSigners();

                await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, 2000);

                for (let i = 0; i < NUM_BIDDERS; i++) {
                    await auction.setBid(5, MINIMUM_PRICE + i * 5, signers[i]);
                }

                await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);

                await auction.transferFunds(signers[0]);

                for (let i = 0; i < NUM_BIDDERS; i++) {
                    await auction.claim(auction.currentBatchId - 1, i % 2 === 0, signers[i]);
                }
            });
            it("All bids are cancelled before new bid can be mined", async function () {
                const NUM_BIDDERS = 20;
                const START_TOKEN_ID = 1;
                const END_TOKEN_ID = 100;
                const MINIMUM_PRICE = 340;
                const PURCHASE_PRICE = 324234;

                const signers = await ethers.getSigners();

                await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, 2000);

                for (let i = 0; i < NUM_BIDDERS; i++) {
                    await auction.setBid(5, MINIMUM_PRICE + i * 5, signers[i]);
                }

                const prevBid = await auction.contract.getPreviousBid(
                    auction.currentBatchId,
                    5,
                    MINIMUM_PRICE + NUM_BIDDERS * 5,
                );

                for (let i = 0; i < NUM_BIDDERS; i++) {
                    await auction.cancelBid(i % 3 === 0, signers[i]);
                }

                await auction.setBid(5, MINIMUM_PRICE + NUM_BIDDERS * 5, signers[NUM_BIDDERS], prevBid);

                await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);

                for (let i = 0; i < NUM_BIDDERS; i++) {
                    await auction.claim(auction.currentBatchId - 1, true, signers[i]);
                }
            });
            it("Minimum price equal to direct purchase price", async function () {
                const NUM_BIDDERS = 20;
                const START_TOKEN_ID = 1;
                const END_TOKEN_ID = 100;
                const MINIMUM_PRICE = 340;
                const PURCHASE_PRICE = 340;

                const signers = await ethers.getSigners();

                await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, 2000);

                await expect(auction.contract.setBid(5, 340, 0)).to.be.revertedWith(
                    "Bid cannot be higher than direct price",
                );

                for (let i = 0; i < NUM_BIDDERS; i++) {
                    await auction.purchase(2, signers[i]);
                }

                await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);
            });

            it("End Batch pagination", async function () {
                const NUM_BIDDERS = 20;
                const START_TOKEN_ID = 1;
                const END_TOKEN_ID = 100;
                const MINIMUM_PRICE = 3;
                const PURCHASE_PRICE = 9876;

                const signers = await ethers.getSigners();

                await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, 2000);

                for (let i = 0; i < NUM_BIDDERS; i++) {
                    await auction.setBid(5, generatePrice(MINIMUM_PRICE, PURCHASE_PRICE, 99, i), signers[i]);
                }

                for (let i = 0; i < 10; i++) {
                    await auction.endBatch(2);
                }
            });
            it("Call whitelistBidders with empty arrays", async function () {
                await auction.whitelistBidders([], [], []);
            });
        });
    });
});

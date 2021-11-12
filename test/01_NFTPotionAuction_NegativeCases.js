const { expect } = require("chai");
const { ethers } = require("hardhat");
const { fastForwardChain, chainEpoch, generatePrice } = require("./NFTPotionAuctionUtils");
const { NFTPotionAuctionHelper } = require("./NFTPotionAuctionHelper");

describe("NFTPotionAuction", function () {
    describe("Negative Cases", function () {
        let auction;

        // Initialize the contract
        beforeEach(async function () {
            auction = new NFTPotionAuctionHelper();
            await auction.initialize();
        });

        /**
         * Start batch
         */
        describe("Start Batch", function () {
            it("Start batch when another batch is started", async function () {
                await auction.startBatch(1, 100, 10, 400, 2000);

                await expect(auction.contract.startBatch(101, 200, 10, 400, await chainEpoch(2000))).to.be.revertedWith(
                    "Auction still active",
                );
            });
            it("Start batch with end date in the past", async function () {
                await expect(auction.contract.startBatch(1, 200, 10, 400, await chainEpoch(-2000))).to.be.revertedWith(
                    "Auction is in the past",
                );
                await expect(auction.contract.startBatch(1, 200, 10, 400, await chainEpoch(-1))).to.be.revertedWith(
                    "Auction is in the past",
                );
            });
            it("Start batch with incorrect start token ID", async function () {
                await expect(auction.contract.startBatch(0, 100, 10, 400, await chainEpoch(2000))).to.be.revertedWith(
                    "Wrong start token ID",
                );
                await expect(auction.contract.startBatch(2, 100, 10, 400, await chainEpoch(2000))).to.be.revertedWith(
                    "Wrong start token ID",
                );
                await expect(auction.contract.startBatch(10, 100, 10, 400, await chainEpoch(2000))).to.be.revertedWith(
                    "Wrong start token ID",
                );

                await auction.startBatch(1, 100, 10, 400, 2000);
                await auction.purchase(100);
                await auction.endBatch(100);

                await expect(auction.contract.startBatch(100, 240, 10, 400, await chainEpoch(2000))).to.be.revertedWith(
                    "Wrong start token ID",
                );
                await expect(auction.contract.startBatch(102, 240, 10, 400, await chainEpoch(2000))).to.be.revertedWith(
                    "Wrong start token ID",
                );

                await auction.startBatch(101, 240, 10, 400, 2000);
                await auction.purchase(140);
                await auction.endBatch(140);

                await expect(auction.contract.startBatch(239, 300, 10, 400, await chainEpoch(2000))).to.be.revertedWith(
                    "Wrong start token ID",
                );
                await expect(auction.contract.startBatch(240, 300, 10, 400, await chainEpoch(2000))).to.be.revertedWith(
                    "Wrong start token ID",
                );
                await expect(auction.contract.startBatch(242, 300, 10, 400, await chainEpoch(2000))).to.be.revertedWith(
                    "Wrong start token ID",
                );
            });
            it("Start batch with direct price less than minimum price", async function () {
                await expect(auction.contract.startBatch(1, 100, 234, 12, await chainEpoch(2000))).to.be.revertedWith(
                    "Minimum higher than purchase price",
                );
                await expect(auction.contract.startBatch(1, 100, 2, 1, await chainEpoch(2000))).to.be.revertedWith(
                    "Minimum higher than purchase price",
                );
            });
        });
        /**
         * Set Bid
         */
        describe("Set Bid", function () {
            it("Call when batch is not active", async function () {
                await expect(auction.contract.setBid(5, 100, 0)).to.be.revertedWith("Auction already ended");

                await auction.startBatch(1, 108, 10, 400, 2000);
                await auction.endBatch(108);

                await expect(auction.contract.setBid(2, 200, 0)).to.be.revertedWith("Auction already ended");
            });
            it("Call with price less than minimum", async function () {
                await auction.startBatch(1, 209, 40, 200, 2000);

                await expect(auction.contract.setBid(88, 0, 0)).to.be.revertedWith("Bid must reach minimum amount");
                await expect(auction.contract.setBid(54, 25, 0)).to.be.revertedWith("Bid must reach minimum amount");
                await expect(auction.contract.setBid(77, 39, 0)).to.be.revertedWith("Bid must reach minimum amount");
            });
            it("Call with price higher or equal than purchase price", async function () {
                await auction.startBatch(1, 209, 40, 200, 2000);

                await expect(auction.contract.setBid(92, 200, 0)).to.be.revertedWith(
                    "Bid cannot be higher than direct price",
                );
                await expect(auction.contract.setBid(102, 205, 0)).to.be.revertedWith(
                    "Bid cannot be higher than direct price",
                );
                await expect(auction.contract.setBid(201, 600, 0)).to.be.revertedWith(
                    "Bid cannot be higher than direct price",
                );
            });
            it("Send amount of cash different than needed", async function () {
                await auction.startBatch(1, 1500, 1, 4098, 2000);

                await expect(auction.contract.setBid(34, 10, 0, { value: 339 })).to.be.revertedWith(
                    "Sent incorrect amount of cash",
                );
                await expect(auction.contract.setBid(34, 10, 0, { value: 341 })).to.be.revertedWith(
                    "Sent incorrect amount of cash",
                );
                await expect(auction.contract.setBid(34, 10, 0, { value: 0 })).to.be.revertedWith(
                    "Sent incorrect amount of cash",
                );
            });
        });

        /**
         * Cancel Bid
         */
        describe("Cancel Bid", function () {
            it("Call when batch is not active", async function () {
                await expect(auction.contract.cancelBid(true)).to.be.revertedWith("Auction already ended");

                await auction.startBatch(1, 108, 10, 400, 2000);
                await auction.endBatch(108);

                await expect(auction.contract.cancelBid(false)).to.be.revertedWith("Auction already ended");
            });
        });

        /**
         * Purchase
         */
        describe("Purchase", function () {
            it("Call when batch is not active", async function () {
                await expect(auction.contract.purchase(1)).to.be.revertedWith("Auction already ended");

                await auction.startBatch(1, 108, 10, 400, 2000);
                await auction.endBatch(108);

                await expect(auction.contract.purchase(2)).to.be.revertedWith("Auction already ended");
            });
            it("Call with more tokens that are auctioned", async function () {
                await auction.startBatch(1, 50, 10, 400, 2000);
                await expect(auction.contract.purchase(51, { value: 800 })).to.be.revertedWith(
                    "Too many tokens for direct purchase",
                );
                await expect(auction.contract.purchase(1200, { value: 800 })).to.be.revertedWith(
                    "Too many tokens for direct purchase",
                );
            });
            it("Call with more tokens that are auctioned", async function () {
                await auction.startBatch(1, 50, 10, 400, 2000);
                await expect(auction.contract.purchase(51, { value: 800 })).to.be.revertedWith(
                    "Too many tokens for direct purchase",
                );
                await expect(auction.contract.purchase(1200, { value: 800 })).to.be.revertedWith(
                    "Too many tokens for direct purchase",
                );
            });
            it("Purchase some and call with more tokens that are left", async function () {
                await auction.startBatch(1, 78, 10, 400, 2000);

                await auction.purchase(20);

                await expect(auction.contract.purchase(59, { value: 590 })).to.be.revertedWith(
                    "Too many tokens for direct purchase",
                );
                await expect(auction.contract.purchase(60, { value: 600 })).to.be.revertedWith(
                    "Too many tokens for direct purchase",
                );
            });
            it("Send less cash that needed", async function () {
                await auction.startBatch(1, 78, 10, 400, 2000);

                await expect(auction.contract.purchase(59, { value: 589 })).to.be.revertedWith(
                    "Sent incorrect amount of cash",
                );
                await expect(auction.contract.purchase(59, { value: 595 })).to.be.revertedWith(
                    "Sent incorrect amount of cash",
                );
                await expect(auction.contract.purchase(1, { value: 9 })).to.be.revertedWith(
                    "Sent incorrect amount of cash",
                );
                await expect(auction.contract.purchase(1, { value: 11 })).to.be.revertedWith(
                    "Sent incorrect amount of cash",
                );
            });
        });

        /**
         * End Batch
         */
        describe("End Batch", function () {
            it("End batch when no batch is started", async function () {
                await expect(auction.contract.endBatch(1)).to.be.revertedWith("Auction has not been started yet");
                await expect(auction.contract.endBatch(100)).to.be.revertedWith("Auction has not been started yet");

                await auction.startBatch(1, 50, 10, 400, 2000);
                await auction.endBatch(50);

                await expect(auction.contract.endBatch(200)).to.be.revertedWith("Auction has not been started yet");
            });
            it("End batch before end date", async function () {
                await auction.startBatch(1, 1092, 10, 400, 2000);

                await expect(auction.contract.endBatch(1092)).to.be.revertedWith("Auction cannot be ended yet");

                fastForwardChain(1000);

                await expect(auction.contract.endBatch(1092)).to.be.revertedWith("Auction cannot be ended yet");
            });
        });

        /**
         * Claim
         */
        describe("Claim", function () {
            it("Call before the batch is started", async function () {
                await expect(auction.contract.claim(1, true)).to.be.revertedWith(
                    "Cannot claim token IDs for a batch that has not ended",
                );
                await expect(auction.contract.claim(2, false)).to.be.revertedWith(
                    "Cannot claim token IDs for a batch that has not ended",
                );
                await expect(auction.contract.claim(100, true)).to.be.revertedWith(
                    "Cannot claim token IDs for a batch that has not ended",
                );

                await auction.startBatch(1, 1092, 10, 400, 2000);
                await auction.endBatch(1092);

                await expect(auction.contract.claim(2, false)).to.be.revertedWith(
                    "Cannot claim token IDs for a batch that has not ended",
                );
            });
            it("Call when bidder has no active bids", async function () {
                await expect(auction.contract.claim(0, true)).to.be.revertedWith("Bidder has no claimable bid");

                await auction.startBatch(1, 876, 10, 400, 2000);
                await auction.endBatch(1092);

                await expect(auction.contract.claim(1, true)).to.be.revertedWith("Bidder has no claimable bid");

                await auction.startBatch(1, 23, 1, 20, 2000);
                await auction.endBatch(23);

                await expect(auction.contract.claim(1, false)).to.be.revertedWith("Bidder has no claimable bid");
                await expect(auction.contract.claim(2, true)).to.be.revertedWith("Bidder has no claimable bid");
            });
        });

        /**
         * Claim Refund
         */
        describe("Claim Refund", function () {
            it("Call when refundable cash is 0", async function () {
                await expect(auction.contract.claimRefund()).to.be.revertedWith("No refundable cash");

                await auction.startBatch(1, 1092, 10, 400, 2000);
                await auction.endBatch(1092);

                await expect(auction.contract.claimRefund()).to.be.revertedWith("No refundable cash");
            });
        });

        /**
         * Whitelist Bidders
         */
        describe("Whitelist Bidders", function () {
            it("Call from non-owner account", async function () {
                const signers = await ethers.getSigners();

                await expect(auction.contract.connect(signers[1]).whitelistBidders([], [], [])).to.be.revertedWith(
                    "Ownable: caller is not the owner",
                );
                await expect(
                    auction.contract
                        .connect(signers[2])
                        .whitelistBidders(["0x1234567890123456789012345678901234567890"], [5], [1]),
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });
            it("Call when batch is active", async function () {
                await auction.startBatch(1, 1092, 10, 400, 2000);

                await expect(auction.contract.whitelistBidders([], [], [])).to.be.revertedWith("Auction still active");

                await auction.endBatch(1092);

                await auction.startBatch(1, 33, 1, 4, 2000);

                await expect(
                    auction.contract.whitelistBidders(["0x1234567890123456789012345678901234567890"], [5], [1]),
                ).to.be.revertedWith("Auction still active");
            });
            it("Call with different length for input arrays", async function () {
                await expect(
                    auction.contract.whitelistBidders(["0x1234567890123456789012345678901234567890"], [], []),
                ).to.be.revertedWith("Mismatch in array sizes for direct whitelist");
                await expect(
                    auction.contract.whitelistBidders(["0x1234567890123456789012345678901234567890"], [5], []),
                ).to.be.revertedWith("Mismatch in array sizes for direct whitelist");
                await expect(
                    auction.contract.whitelistBidders(["0x1234567890123456789012345678901234567890"], [], [1]),
                ).to.be.revertedWith("Mismatch in array sizes for direct whitelist");
                await expect(
                    auction.contract.whitelistBidders(["0x1234567890123456789012345678901234567890"], [5, 6], [1]),
                ).to.be.revertedWith("Mismatch in array sizes for direct whitelist");
                await expect(
                    auction.contract.whitelistBidders(
                        ["0x1234567890123456789012345678901234567890", "0x1234567890123456789012345678901234567891"],
                        [5, 6],
                        [1],
                    ),
                ).to.be.revertedWith("Mismatch in array sizes for direct whitelist");
                await expect(
                    auction.contract.whitelistBidders(
                        ["0x1234567890123456789012345678901234567890", "0x1234567890123456789012345678901234567891"],
                        [5, 6],
                        [1, 2, 3],
                    ),
                ).to.be.revertedWith("Mismatch in array sizes for direct whitelist");
            });
            it("Call with gaps or overlaps in token IDs list", async function () {
                await expect(
                    auction.contract.whitelistBidders(
                        ["0x1234567890123456789012345678901234567890", "0x1234567890123456789012345678901234567891"],
                        [5, 8],
                        [1, 5],
                    ),
                ).to.be.revertedWith("Cannot have gaps or overlaps when whitelisting");
                await expect(
                    auction.contract.whitelistBidders(
                        ["0x1234567890123456789012345678901234567890", "0x1234567890123456789012345678901234567891"],
                        [5, 8],
                        [1, 7],
                    ),
                ).to.be.revertedWith("Cannot have gaps or overlaps when whitelisting");
                await expect(
                    auction.contract.whitelistBidders(
                        [
                            "0x1234567890123456789012345678901234567890",
                            "0x1234567890123456789012345678901234567891",
                            "0x1234567890123456789012345678901234567892",
                        ],
                        [5, 8, 2],
                        [1, 6, 13],
                    ),
                ).to.be.revertedWith("Cannot have gaps or overlaps when whitelisting");
                await expect(
                    auction.contract.whitelistBidders(
                        [
                            "0x1234567890123456789012345678901234567890",
                            "0x1234567890123456789012345678901234567891",
                            "0x1234567890123456789012345678901234567892",
                        ],
                        [5, 8, 2],
                        [1, 6, 15],
                    ),
                ).to.be.revertedWith("Cannot have gaps or overlaps when whitelisting");
            });
        });

        /**
         * Transfer Funds
         */
        describe("Transfer Funds", function () {
            it("Call with non-owner account", async function () {
                const signers = await ethers.getSigners();

                await expect(auction.contract.connect(signers[1]).transferFunds(signers[2].address)).to.be.revertedWith(
                    "Ownable: caller is not the owner",
                );

                await expect(auction.contract.connect(signers[2]).transferFunds(signers[2].address)).to.be.revertedWith(
                    "Ownable: caller is not the owner",
                );
            });
        });

        /**
         * Pagination
         */
        describe("Pagination", function () {
            it("Set a bid between paginated endBatch", async function () {
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

                await auction.endBatch(10);

                // Try to set a bid
                await expect(auction.contract.setBid(5, MINIMUM_PRICE, 0)).to.be.revertedWith("Auction already ended");

                await auction.endBatch(10);
            });
            it("Cancel a bid between paginated endBatch", async function () {
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

                await auction.endBatch(10);

                // Try to cancel a bid
                await expect(auction.contract.cancelBid(true)).to.be.revertedWith("Auction already ended");
                await expect(auction.contract.cancelBid(false)).to.be.revertedWith("Auction already ended");

                // All bids should be outstanding
                await auction.endBatch(10);
            });
            it("Claim a bid between paginated endBatch", async function () {
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

                await auction.endBatch(10);

                // Try to cancel a bid
                await expect(auction.contract.claim(auction.currentBatchId, true)).to.be.revertedWith(
                    "Cannot claim token IDs for a batch that has not ended",
                );
                await expect(auction.contract.claim(auction.currentBatchId, false)).to.be.revertedWith(
                    "Cannot claim token IDs for a batch that has not ended",
                );

                // All bids should be outstanding
                await auction.endBatch(10);
            });
            it("Call with bids to process equal to 0", async function () {
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

                await expect(auction.contract.endBatch(0)).to.be.revertedWith("Call with at least 1 bid to process");
            });
        });
    });
});

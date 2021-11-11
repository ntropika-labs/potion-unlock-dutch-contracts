const { expect } = require("chai");
const { ethers } = require("hardhat");
const { generatePrice } = require("./NFTPotionAuctionUtils");

const { NFTPotionAuctionHelper } = require("./NFTPotionAuctionHelper");

describe("NFTPotionAuction", function () {
    describe("Auction Full Cycle", function () {
        let auction;

        // Initialize the contract
        beforeEach(async function () {
            auction = new NFTPotionAuctionHelper();
            await auction.initialize();
        });

        /**
         * Simple
         */
        describe("Simple", function () {
            it("1 Batch, 20 bidders, 100 token IDs", async function () {
                const NUM_BIDDERS = 20;
                const START_TOKEN_ID = 1;
                const END_TOKEN_ID = 100;
                const MINIMUM_PRICE = 20;
                const PURCHASE_PRICE = 12333;

                const signers = await ethers.getSigners();

                await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, 2000);

                for (let i = 0; i < NUM_BIDDERS; i++) {
                    await auction.setBid(5, generatePrice(MINIMUM_PRICE, PURCHASE_PRICE, 2, i), signers[i]);
                }
                for (let i = 0; i < NUM_BIDDERS; i++) {
                    await auction.setBid(5, generatePrice(MINIMUM_PRICE, PURCHASE_PRICE, 3, i), signers[i]);
                }

                await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);
            });
            it("2 Batches, 20 bidders, 10 token IDs, then 100 token IDs", async function () {
                {
                    const NUM_BIDDERS = 20;
                    const START_TOKEN_ID = 1;
                    const END_TOKEN_ID = 10;
                    const MINIMUM_PRICE = 20;
                    const PURCHASE_PRICE = 300;

                    const signers = await ethers.getSigners();

                    await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, 2000);

                    for (let i = 0; i < NUM_BIDDERS; i++) {
                        await auction.setBid(5, generatePrice(MINIMUM_PRICE, PURCHASE_PRICE, 37, i), signers[i]);
                    }
                    for (let i = 0; i < NUM_BIDDERS; i++) {
                        await auction.setBid(5, generatePrice(MINIMUM_PRICE, PURCHASE_PRICE, 41, i), signers[i]);
                    }

                    await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);
                }
                {
                    const NUM_BIDDERS = 20;
                    const START_TOKEN_ID = 11;
                    const END_TOKEN_ID = 111;
                    const MINIMUM_PRICE = 37;
                    const PURCHASE_PRICE = 700;

                    const signers = await ethers.getSigners();

                    await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, 2000);

                    for (let i = 0; i < NUM_BIDDERS; i++) {
                        await auction.setBid(5, generatePrice(MINIMUM_PRICE, PURCHASE_PRICE, 58, i), signers[i]);
                    }
                    for (let i = 0; i < NUM_BIDDERS; i++) {
                        await auction.setBid(5, generatePrice(MINIMUM_PRICE, PURCHASE_PRICE, 17, i), signers[i]);
                    }

                    await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);
                }
            });
        });
        /**
         * Purchase
         */
        describe("Purchase", function () {
            it("1 Batch, 20 tokens, 1 bidder purchases 5 tokens", async function () {
                const NUM_BIDDERS = 20;
                const START_TOKEN_ID = 1;
                const END_TOKEN_ID = 20;
                const MINIMUM_PRICE = 20;
                const PURCHASE_PRICE = 12333;

                const signers = await ethers.getSigners();

                await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, 2000);

                await auction.purchase(5, signers[NUM_BIDDERS]);

                await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);

                const whitelistRanges = await auction.contract.getWhitelistRanges(signers[NUM_BIDDERS].address);
                expect(whitelistRanges.length).to.be.equal(1);
                expect(whitelistRanges[0].firstId).to.be.equal(START_TOKEN_ID);
                expect(whitelistRanges[0].lastId).to.be.equal(START_TOKEN_ID + 4);
            });
            it("1 Batch, 20 tokens, 3 bidders purchase 7,2,3 tokens each", async function () {
                const NUM_BIDDERS = 40;
                const START_TOKEN_ID = 1;
                const END_TOKEN_ID = 20;
                const MINIMUM_PRICE = 67;
                const PURCHASE_PRICE = 200000;

                const signers = await ethers.getSigners();

                await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, 2000);

                await auction.purchase(7, signers[NUM_BIDDERS]);
                await auction.purchase(2, signers[NUM_BIDDERS + 1]);
                await auction.purchase(3, signers[0]);

                await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);

                // Purchaser of 7
                {
                    const whitelistRanges = await auction.contract.getWhitelistRanges(signers[NUM_BIDDERS].address);
                    expect(whitelistRanges.length).to.be.greaterThanOrEqual(1);
                    expect(whitelistRanges[0].firstId).to.be.equal(START_TOKEN_ID);
                    expect(whitelistRanges[0].lastId).to.be.equal(START_TOKEN_ID + 6);
                }
                // Purchaser of 2
                {
                    const whitelistRanges = await auction.contract.getWhitelistRanges(signers[NUM_BIDDERS + 1].address);
                    expect(whitelistRanges.length).to.be.greaterThanOrEqual(1);
                    expect(whitelistRanges[0].firstId).to.be.equal(START_TOKEN_ID + 7);
                    expect(whitelistRanges[0].lastId).to.be.equal(START_TOKEN_ID + 8);
                }
                // Purchaser of 3
                {
                    const whitelistRanges = await auction.contract.getWhitelistRanges(signers[0].address);
                    expect(whitelistRanges.length).to.be.greaterThanOrEqual(1);
                    expect(whitelistRanges[0].firstId).to.be.equal(START_TOKEN_ID + 9);
                    expect(whitelistRanges[0].lastId).to.be.equal(START_TOKEN_ID + 11);
                }
            });
            it("1 Batch, 100 tokens, 10 bidders purchase 1 to 6 tokens each", async function () {
                const START_TOKEN_ID = 1;
                const END_TOKEN_ID = 100;
                const MINIMUM_PRICE = 0;
                const PURCHASE_PRICE = 20000;

                const signers = await ethers.getSigners();

                await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, 2000);

                const purchases = [1, 6, 4, 2, 6, 2, 3, 1, 4, 6];

                for (let i = 0; i < purchases.length; i++) {
                    await auction.purchase(purchases[i], signers[i]);
                }

                await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);

                // Checks
                let currentTokenId = START_TOKEN_ID;

                for (let i = 0; i < purchases.length; i++) {
                    const whitelistRanges = await auction.contract.getWhitelistRanges(signers[i].address);

                    expect(whitelistRanges.length).to.be.equal(1);
                    expect(whitelistRanges[0].firstId).to.be.equal(currentTokenId);
                    expect(whitelistRanges[0].lastId).to.be.equal(currentTokenId + purchases[i] - 1);

                    currentTokenId += purchases[i];
                }
            });
        });
        /**
         * Auction + Purchase
         */
        describe("Auction + Purchase", function () {
            it("1 Batch, 129 tokens, 12 bidders, 5 purchasers", async function () {
                const NUM_BIDDERS = 12;
                const START_TOKEN_ID = 1;
                const END_TOKEN_ID = 129;
                const MINIMUM_PRICE = 1;
                const PURCHASE_PRICE = 200;

                const signers = await ethers.getSigners();
                const purchases = [13, 44, 4, 7, 9];

                await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, 2000);

                for (let i = 0; i < NUM_BIDDERS / 2; i++) {
                    await auction.setBid((i + 1) * 3, generatePrice(MINIMUM_PRICE, PURCHASE_PRICE, 2, i), signers[i]);
                }

                await auction.purchase(purchases[0], signers[0]);

                for (let i = NUM_BIDDERS / 2; i < NUM_BIDDERS; i++) {
                    await auction.setBid((i + 1) * 4, generatePrice(MINIMUM_PRICE, PURCHASE_PRICE, 6, i), signers[i]);
                }

                await auction.purchase(purchases[1], signers[1]);

                for (let i = 0; i < NUM_BIDDERS; i++) {
                    await auction.setBid((i + 1) * 5, generatePrice(MINIMUM_PRICE, PURCHASE_PRICE, 99, i), signers[i]);
                }

                await auction.purchase(purchases[2], signers[2]);

                for (let i = 0; i < NUM_BIDDERS; i++) {
                    await auction.setBid((i + 1) * 2, generatePrice(MINIMUM_PRICE, PURCHASE_PRICE, 101, i), signers[i]);
                }

                await auction.purchase(purchases[3], signers[3]);
                await auction.purchase(purchases[4], signers[4]);

                for (let i = 0; i < NUM_BIDDERS; i++) {
                    await auction.setBid((i + 1) * 8, generatePrice(MINIMUM_PRICE, PURCHASE_PRICE, 102, i), signers[i]);
                }

                await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);

                // Checks
                let currentTokenId = START_TOKEN_ID;
                for (let i = 0; i < purchases.length; i++) {
                    const whitelistRanges = await auction.contract.getWhitelistRanges(signers[i].address);

                    expect(whitelistRanges.length).to.be.equal(1);
                    expect(whitelistRanges[0].firstId).to.be.equal(currentTokenId);
                    expect(whitelistRanges[0].lastId).to.be.equal(currentTokenId + purchases[i] - 1);

                    currentTokenId += purchases[i];
                }
            });
        });
        /**
         * Cancel Bid
         */
        describe("Cancel Bid", function () {
            it("1 Batch, 876 tokens, previous bid is cancelled before new bid is mined", async function () {
                const NUM_BIDDERS = 30;
                const START_TOKEN_ID = 1;
                const END_TOKEN_ID = 876;
                const MINIMUM_PRICE = 1;
                const PURCHASE_PRICE = 200;

                const signers = await ethers.getSigners();

                await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, 2000);

                for (let i = 0; i < NUM_BIDDERS; i++) {
                    await auction.setBid(5, MINIMUM_PRICE + 5 * i, signers[i]);
                }

                for (let i = 0; i < NUM_BIDDERS; i++) {
                    const prevBid = await auction.contract.getPreviousBid(
                        auction.currentBatchId,
                        5,
                        MINIMUM_PRICE + 5 * (i + 1) + 1,
                    );

                    await auction.cancelBid(false, signers[(i + 1) % NUM_BIDDERS]);
                    await auction.setBid(5, MINIMUM_PRICE + 5 * (i + 1) + 1, signers[i], prevBid);
                }
            });
            it("1 Batch, 18 tokens, previous 10 bids are cancelled before new bid is mined", async function () {
                const NUM_BIDDERS = 40;
                const START_TOKEN_ID = 1;
                const END_TOKEN_ID = 18;
                const MINIMUM_PRICE = 1;
                const PURCHASE_PRICE = 200;

                const signers = await ethers.getSigners();

                await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, 2000);

                for (let i = 0; i < NUM_BIDDERS; i++) {
                    await auction.setBid(
                        (i % (END_TOKEN_ID - START_TOKEN_ID + 1)) + 1,
                        MINIMUM_PRICE + 4 * i,
                        signers[i],
                    );
                }

                const prevBid = await auction.contract.getPreviousBid(
                    auction.currentBatchId,
                    20,
                    MINIMUM_PRICE + 4 * 10 + 1,
                );

                for (let i = 0; i < 10; i++) {
                    await auction.cancelBid(false, signers[i]);
                }

                await auction.setBid(5, MINIMUM_PRICE + 4 * 10 + 1, signers[NUM_BIDDERS], prevBid);
            });
        });
    });
});

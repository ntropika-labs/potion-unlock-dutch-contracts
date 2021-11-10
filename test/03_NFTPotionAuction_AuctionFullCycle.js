const { expect } = require("chai");
const { ethers } = require("hardhat");
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
                    await auction.setBid(5, MINIMUM_PRICE + 2 * i, signers[i]);
                }
                for (let i = 0; i < NUM_BIDDERS; i++) {
                    await auction.setBid(5, MINIMUM_PRICE + 3 * i, signers[i]);
                }

                await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);
            });
            it("2 Batches, 20 bidders, 10 token IDs, then 100 token IDs", async function () {
                function generatePrice(minimumPrice, purchasePrice, factor, index) {
                    return ((minimumPrice + factor * index) % (purchasePrice - minimumPrice)) + minimumPrice;
                }

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

                for (let i = 0; i < NUM_BIDDERS; i++) {
                    await auction.setBid(5, MINIMUM_PRICE + 2 * i, signers[i]);
                }

                await auction.purchase(5, signers[NUM_BIDDERS]);

                for (let i = 0; i < NUM_BIDDERS; i++) {
                    await auction.setBid(5, MINIMUM_PRICE + 3 * i, signers[i]);
                }

                await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);

                const whitelistRanges = await auction.contract.getWhitelistRanges(signers[NUM_BIDDERS].address);
                expect(whitelistRanges.length).to.be.equal(1);
                expect(whitelistRanges[0].firstId).to.be.equal(START_TOKEN_ID);
                expect(whitelistRanges[0].lastId).to.be.equal(START_TOKEN_ID + 4);
            });
        });
    });
});

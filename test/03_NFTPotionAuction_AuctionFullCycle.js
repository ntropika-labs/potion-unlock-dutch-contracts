const { expect } = require("chai");
const { ethers } = require("hardhat");
const { chainEpoch, fastForwardChain } = require("./NFTPotionAuctionUtils");
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
         * Start batch
         */
        describe("Auction", function () {
            it("1 Batch, 20 bidders, 100 token IDs", async function () {
                const NUM_BIDDERS = 20;
                const START_TOKEN_ID = 1;
                const END_TOKEN_ID = 1;
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

                await auction.endBatch(100);
            });
        });
    });
});

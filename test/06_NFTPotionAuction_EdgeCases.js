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

        describe("Misc", function () {
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

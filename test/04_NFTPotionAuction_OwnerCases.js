const { expect } = require("chai");
const { ethers } = require("hardhat");
const { generatePrice } = require("./NFTPotionAuctionUtils");

const { NFTPotionAuctionHelper } = require("./NFTPotionAuctionHelper");

describe.skip("NFTPotionAuction", function () {
    describe("Owner Cases", function () {
        let auction;

        // Initialize the contract
        beforeEach(async function () {
            auction = new NFTPotionAuctionHelper();
            await auction.initialize();
        });

        /**
         * Whitelist Bidders
         */
        describe("Whitelist Bidders", function () {
            it("Whitelist before very first batch", async function () {
                const bidders = [
                    "0x0000000000000000000000000000000000000001",
                    "0x0000000000000000000000000000000000000002",
                    "0x0000000000000000000000000000000000000003",
                    "0x0000000000000000000000000000000000000004",
                    "0x0000000000000000000000000000000000000005",
                    "0x0000000000000000000000000000000000000006",
                    "0x0000000000000000000000000000000000000007",
                ];
                const numTokens = [5, 8, 10, 3, 4, 8, 9];
                const firstTokenIDs = [1, 6, 14, 24, 27, 31, 39];

                await auction.whitelistBidders(bidders, numTokens, firstTokenIDs);

                for (let i = 0; i < bidders.length; i++) {
                    const whitelist = await auction.contract.getWhitelistRanges(bidders[i]);

                    expect(whitelist.length).to.equal(1);

                    expect(whitelist[0].firstId).to.be.equal(firstTokenIDs[i]);
                    expect(whitelist[0].lastId).to.be.equal(firstTokenIDs[i] + numTokens[i] - 1);
                }
            });
            it("Whitelist after very first batch", async function () {
                // First Batch
                const START_TOKEN_ID = 1;
                const END_TOKEN_ID = 120;
                const MINIMUM_PRICE = 20;
                const PURCHASE_PRICE = 12333;

                await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, 2000);
                await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);

                // Whitelist now
                const bidders = [
                    "0x0000000000000000000000000000000000000001",
                    "0x0000000000000000000000000000000000000002",
                    "0x0000000000000000000000000000000000000003",
                    "0x0000000000000000000000000000000000000004",
                    "0x0000000000000000000000000000000000000005",
                    "0x0000000000000000000000000000000000000006",
                    "0x0000000000000000000000000000000000000007",
                ];
                const numTokens = [5, 8, 10, 3, 4, 8, 9];
                const firstTokenIDs = [1, 6, 14, 24, 27, 31, 39];

                await auction.whitelistBidders(bidders, numTokens, firstTokenIDs);

                for (let i = 0; i < bidders.length; i++) {
                    const whitelist = await auction.contract.getWhitelistRanges(bidders[i]);

                    expect(whitelist.length).to.equal(1);

                    expect(whitelist[0].firstId).to.be.equal(firstTokenIDs[i]);
                    expect(whitelist[0].lastId).to.be.equal(firstTokenIDs[i] + numTokens[i] - 1);
                }
            });
            it("Whitelist after selling some tokens in normal auction", async function () {
                // First Batch
                const NUM_BIDDERS = 20;
                const START_TOKEN_ID = 1;
                const END_TOKEN_ID = 120;
                const MINIMUM_PRICE = 20;
                const PURCHASE_PRICE = 12333;

                const signers = await ethers.getSigners();

                await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, 2000);

                for (let i = 0; i < NUM_BIDDERS; i++) {
                    await auction.setBid(6, MINIMUM_PRICE + i, signers[i]);
                }

                await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);

                // Whitelist now
                const bidders = [
                    "0x0000000000000000000000000000000000000001",
                    "0x0000000000000000000000000000000000000002",
                    "0x0000000000000000000000000000000000000003",
                    "0x0000000000000000000000000000000000000004",
                    "0x0000000000000000000000000000000000000005",
                    "0x0000000000000000000000000000000000000006",
                    "0x0000000000000000000000000000000000000007",
                ];
                const numTokens = [5, 8, 10, 3, 4, 8, 9];
                const firstTokenIDs = [121, 126, 134, 144, 147, 151, 159];

                await auction.whitelistBidders(bidders, numTokens, firstTokenIDs);

                for (let i = 0; i < bidders.length; i++) {
                    const whitelist = await auction.contract.getWhitelistRanges(bidders[i]);

                    expect(whitelist.length).to.equal(1);

                    expect(whitelist[0].firstId).to.be.equal(firstTokenIDs[i]);
                    expect(whitelist[0].lastId).to.be.equal(firstTokenIDs[i] + numTokens[i] - 1);
                }
            });
        });
        /**
         * Tranfer Funds
         */
        describe("Transfer Funds", function () {
            it("Transfer funds after very first auction", async function () {
                const NUM_BIDDERS = 20;
                const START_TOKEN_ID = 1;
                const END_TOKEN_ID = 120;
                const MINIMUM_PRICE = 20;
                const PURCHASE_PRICE = 12333;

                const signers = await ethers.getSigners();

                await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, 2000);

                for (let i = 0; i < NUM_BIDDERS; i++) {
                    await auction.setBid(6, MINIMUM_PRICE + i * 2, signers[i]);
                }

                await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);

                await auction.transferFunds(signers[0]);
            });
            it("Transfer funds after first auction and after second auction", async function () {
                {
                    const NUM_BIDDERS = 30;
                    const START_TOKEN_ID = 1;
                    const END_TOKEN_ID = 120;
                    const MINIMUM_PRICE = 200;
                    const PURCHASE_PRICE = 12333;

                    const signers = await ethers.getSigners();

                    await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, 2000);

                    for (let i = 0; i < NUM_BIDDERS; i++) {
                        await auction.setBid(
                            2 * i + 1,
                            generatePrice(MINIMUM_PRICE, PURCHASE_PRICE, 37, i),
                            signers[i],
                        );
                    }

                    await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);

                    await auction.transferFunds(signers[0]);
                }
                {
                    const NUM_BIDDERS = 30;
                    const START_TOKEN_ID = 121;
                    const END_TOKEN_ID = 220;
                    const MINIMUM_PRICE = 2000;
                    const PURCHASE_PRICE = 456879;

                    const signers = await ethers.getSigners();

                    await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, 2000);

                    for (let i = 0; i < NUM_BIDDERS; i++) {
                        await auction.setBid(
                            2 * i + 1,
                            generatePrice(MINIMUM_PRICE, PURCHASE_PRICE, 37, i),
                            signers[i],
                        );
                    }

                    await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);

                    await auction.transferFunds(signers[1]);
                }
            });
            it("Transfer funds only after 3 successful auctions", async function () {
                const batches = [
                    {
                        NUM_BIDDERS: 30,
                        START_TOKEN_ID: 1,
                        END_TOKEN_ID: 120,
                        MINIMUM_PRICE: 200,
                        PURCHASE_PRICE: 1239933,
                    },
                    {
                        NUM_BIDDERS: 20,
                        START_TOKEN_ID: 1,
                        END_TOKEN_ID: 154,
                        MINIMUM_PRICE: 20000,
                        PURCHASE_PRICE: 987623,
                    },
                    {
                        NUM_BIDDERS: 10,
                        START_TOKEN_ID: 1,
                        END_TOKEN_ID: 1000,
                        MINIMUM_PRICE: 1,
                        PURCHASE_PRICE: 123456788,
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
                        await auction.setBid(
                            j + 1,
                            generatePrice(batches[i].MINIMUM_PRICE, batches[i].PURCHASE_PRICE, 37, j),
                            signers[j],
                        );
                    }

                    await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);

                    await auction.transferFunds(signers[i]);

                    baseTokenId += auction.currentBatch.numTokensSold;
                }
            });
        });
    });
});

const { ethers } = require("hardhat");
const { generatePrice } = require("./NFTPotionAuctionUtils");

const { NFTPotionAuctionHelper } = require("./NFTPotionAuctionHelper");

describe.skip("NFTPotionAuction", function () {
    describe("User Refunds", function () {
        let auction;

        // Initialize the contract
        beforeEach(async function () {
            auction = new NFTPotionAuctionHelper();
            await auction.initialize();
        });

        it("Several batches, claim refunds before new batch starts", async function () {
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

                baseTokenId += auction.currentBatch.numTokensSold;

                for (let j = 0; j < batches[i].NUM_BIDDERS; j++) {
                    await auction.claimRefund(signers[j]);
                }
            }
        });

        it("Several batches, claim refunds after new batch starts", async function () {
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
                    await auction.claimRefund(signers[j]);
                }

                for (let j = 0; j < batches[i].NUM_BIDDERS; j++) {
                    await auction.setBid(
                        j + 1,
                        generatePrice(batches[i].MINIMUM_PRICE, batches[i].PURCHASE_PRICE, 37, j),
                        signers[j],
                    );
                }

                await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);

                baseTokenId += auction.currentBatch.numTokensSold;
            }
        });

        it("Several batches, claim some refunds before, during and after batch", async function () {
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

                for (let j = 0; j < batches[i].NUM_BIDDERS / 3; j++) {
                    await auction.claimRefund(signers[j]);
                }

                for (let j = 0; j < batches[i].NUM_BIDDERS; j++) {
                    await auction.setBid(
                        j + 1,
                        generatePrice(batches[i].MINIMUM_PRICE, batches[i].PURCHASE_PRICE, 37, j),
                        signers[j],
                    );

                    await auction.cancelBid(false, signers[(j * 5 + 3) % batches[i].NUM_BIDDERS]);
                    await auction.claimRefund(signers[(j * 5 + 3) % batches[i].NUM_BIDDERS]);
                }

                for (let j = batches[i].NUM_BIDDERS / 3; j < (2 * batches[i].NUM_BIDDERS) / 3; j++) {
                    await auction.cancelBid(false, signers[j]);
                    await auction.claimRefund(signers[j]);
                }

                await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);

                for (let j = (2 * batches[i].NUM_BIDDERS) / 3; j < (5 * batches[i].NUM_BIDDERS) / 6; j++) {
                    await auction.claimRefund(signers[j]);
                }

                baseTokenId += auction.currentBatch.numTokensSold;
            }
        });
    });
});

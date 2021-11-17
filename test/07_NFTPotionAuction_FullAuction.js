const { ethers } = require("hardhat");
const seedrandom = require("seedrandom");

const { NFTPotionAuctionHelper } = require("./NFTPotionAuctionHelper");

async function userAction(getRandom, signer, auction, minimumPrice, purchasePrice, startTokenId, endTokenId) {
    const action = getRandom() % 100;

    switch (true) {
        // No action
        case action <= 5:
            break;

        // Bid
        case action <= 40:
            const pricePerToken = minimumPrice + (getRandom() % (purchasePrice - minimumPrice - 1));
            const numTokens = getRandom() % (endTokenId - startTokenId + 1);

            await auction.setBid(numTokens, pricePerToken, signer);
            break;

        // Cancel Bid
        case action <= 55:
            const withRefund = getRandom() % 2 === 0;
            await auction.cancelBid(withRefund, signer);
            break;

        // Purchase
        case action <= 75:
            break;

        // Claim Refund
        case action <= 90:
            await auction.claimRefund(signer);
            break;

        // Transfer funds
        case action <= 99:
            await auction.transferFunds(signer);
            break;

        default:
            break;
    }
}

async function afterBatchAction(
    getRandom,
    signer,
    maxBatches,
    auction,
    minimumPrice,
    purchasePrice,
    startTokenId,
    endTokenId,
) {
    const action = getRandom() % 100;
    switch (true) {
        // Claim Refund
        case action <= 20:
            await auction.claimRefund(signer);
            break;
        // Claim
        case action <= 80:
            if (maxBatches > 0) {
                const batchId = (getRandom() % maxBatches) + 1;
                const alsoRefund = getRandom() % 2 === 0;

                await auction.claim(batchId, alsoRefund, signer);
            }
            break;

        // No action
        default:
            break;
    }
}

describe.skip("NFTPotionAuction", function () {
    // The random seed is generated randomly and printed to the console. In case the test
    // fails you can use this seed to reproduce the problem.
    const RANDOM_SEED = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    const getRandomFloat = seedrandom(RANDOM_SEED);
    const getRandom = () => Math.floor(getRandomFloat() * Number.MAX_SAFE_INTEGER);

    describe(`Full Auction (RandomSeed = ${RANDOM_SEED})`, function () {
        let auction;

        // Initialize the contract
        beforeEach(async function () {
            auction = new NFTPotionAuctionHelper();
            await auction.initialize();
        });

        it("3 Batches, 3000, 7000 tokens, 1000 bidders, random distribution", async function () {
            const batches = [
                {
                    NUM_BIDDERS: 1000,
                    START_TOKEN_ID: 1,
                    END_TOKEN_ID: 3000,
                    MINIMUM_PRICE: 200,
                    PURCHASE_PRICE: 50000,
                    NUM_ROUNDS: 3,
                    NUM_BIDS_END_BATCH: 5,
                },
                {
                    NUM_BIDDERS: 1000,
                    START_TOKEN_ID: 1,
                    END_TOKEN_ID: 7000,
                    MINIMUM_PRICE: 1,
                    PURCHASE_PRICE: 45600,
                    NUM_ROUNDS: 3,
                    NUM_BIDS_END_BATCH: 7000,
                },
            ];

            let baseTokenId = 0;

            for (let i = 0; i < batches.length; i++) {
                console.log(`\t[Batch ${i + 1}/${batches.length}]`);
                const START_TOKEN_ID = baseTokenId + batches[i].START_TOKEN_ID;
                const END_TOKEN_ID = baseTokenId + batches[i].END_TOKEN_ID;

                const signers = await ethers.getSigners();

                await auction.startBatch(
                    START_TOKEN_ID,
                    END_TOKEN_ID,
                    batches[i].MINIMUM_PRICE,
                    batches[i].PURCHASE_PRICE,
                    200000,
                );

                // Rounds
                for (let j = 0; j < batches[i].NUM_ROUNDS; j++) {
                    for (let k = 0; k < batches[i].NUM_BIDDERS; k++) {
                        process.stdout.write(
                            `\t   [Round ${j + 1}/${batches[i].NUM_ROUNDS}]: ${Math.floor(
                                (100 * k) / batches[i].NUM_BIDDERS,
                            )}%                   \r`,
                        );

                        await userAction(
                            getRandom,
                            signers[k],
                            auction,
                            batches[i].MINIMUM_PRICE,
                            batches[i].PURCHASE_PRICE,
                            START_TOKEN_ID,
                            END_TOKEN_ID,
                        );
                    }

                    process.stdout.write(`\t   [Round ${j + 1}/${batches[i].NUM_ROUNDS}]: 100%                   \n`);
                }

                const numBidsToProcess = auction.getNumBidsToProcessForEndBatch();
                for (let j = 0; j < numBidsToProcess; j += batches[i].NUM_BIDS_END_BATCH) {
                    await auction.endBatch(batches[i].NUM_BIDS_END_BATCH);
                }

                for (let j = 0; j < batches[i].NUM_BIDDERS; j++) {
                    await afterBatchAction(
                        getRandom,
                        signers[j],
                        i,
                        auction,
                        batches[i].MINIMUM_PRICE,
                        batches[i].PURCHASE_PRICE,
                        START_TOKEN_ID,
                        END_TOKEN_ID,
                    );
                }

                if (getRandom() % 100 < 70) {
                    const signerIndex = getRandom() % batches[i].NUM_BIDDERS;
                    await auction.transferFunds(signers[signerIndex]);
                }

                baseTokenId += auction.currentBatch.numTokensSold;
            }
        }).timeout(1000000);
    });
});

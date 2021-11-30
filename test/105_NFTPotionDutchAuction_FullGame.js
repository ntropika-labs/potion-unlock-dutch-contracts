const { expect } = require("chai").use(require("chai-bytes"));
const { before } = require("mocha");
const { ethers } = require("hardhat");

const { NFTPotionV2Helper } = require("./NFTPotionV2Helper");

const { toBN, fromBN } = require("./NFTPotionAuctionUtils");
const { deployPotionNFTV2Game } = require("../scripts/deployUtils");
const { getMerkleProofWithTree } = require("../scripts/merkleUtils");
const {
    getSecretPieceFromId,
    getSecretStartAndLength,
    buildMerkleTree,
    getPotionGenesis,
    getRaritiesConfig,
} = require("../scripts/lib/utils");
const { range, initRandom, expectThrow, shuffle } = require("./testUtils");
const { bufferToHex } = require("ethereumjs-util");

describe("NFTPotionDutchAuction", function () {
    let signers;
    let raritiesConfig;
    let owner;

    let buyersTokenIDs;

    const { seed, getRandom } = initRandom();

    function getPercent() {
        return getRandom() % 100;
    }

    function addTokenRange(buyerIndex, start, end) {
        buyersTokenIDs[buyerIndex].push(...range(start, end));
    }

    before(async function () {
        signers = await ethers.getSigners();
        raritiesConfig = getRaritiesConfig();
        owner = signers[0];
        buyersTokenIDs = Array.from(Array(signers.length), () => []);
    });

    describe(`Full Game (Seed = ${seed})`, function () {
        let auction;
        let NFTValidatorV2;

        async function expectPurchaseThrow(id, amount, price, publicKey, sendValue, buyer, error) {
            await expectThrow(async () => auction.purchase(id, amount, price, publicKey, sendValue, buyer), error);
        }

        // Initialize the contract
        before(async function () {
            let NFTPotionV2;
            ({ NFTPotionV2, NFTValidatorV2 } = await deployPotionNFTV2Game(false, false));

            auction = new NFTPotionV2Helper(NFTPotionV2);
            await auction.initialize();
        });

        it(`Dutch Auction, sell all NFTs`, async function () {
            const NUM_BUYERS = 800;
            const MAX_BUYERS = 1000;
            const MAX_ITEMS = 200;
            const ITEMS_IDS = shuffle(range(0, raritiesConfig.length - 1), getRandom);

            // Give access to buyers
            for (let i = 0; i < NUM_BUYERS; i++) {
                await auction.NFTPotionAccessList.setAccess(signers[i].address, true);
            }

            console.log("\t[Dutch Auction]");

            let totalNFTsAllRarities = 0;

            for (let i = 0; i < ITEMS_IDS.length; i++) {
                const id = ITEMS_IDS[i];

                const initialPrice = (getRandom() % 10000) + 1000;
                const totalItemsRarity = raritiesConfig[id].endTokenId - raritiesConfig[id].startTokenId + 1;
                let totalAvailable = totalItemsRarity;

                // Auction starts
                await auction.startAuction(id, initialPrice);

                while (totalAvailable > 0) {
                    process.stdout.write(
                        `\t    [Rarity ${i + 1}/${ITEMS_IDS.length} ID=${id}]: ${Math.floor(
                            (100.0 * (totalItemsRarity - totalAvailable)) / totalItemsRarity,
                        )}%             \r`,
                    );

                    const currentPrice = await auction.purchasePrice();

                    const buyerIndex = getRandom() % MAX_BUYERS;
                    const buyer = signers[buyerIndex];
                    const amountToPurchase = getRandom() % (Math.min(totalAvailable, MAX_ITEMS) + 20); // Small chance of overbuy
                    const purchasePrice = getRandom() % (currentPrice + 10); // Small chance of overprice
                    let sendValue = currentPrice * amountToPurchase;
                    if (getPercent() <= 2) {
                        sendValue = Math.max(currentPrice * amountToPurchase - (getRandom() % 20), 0);
                    }

                    let actualAmountPurchased = 0;

                    if (buyerIndex >= NUM_BUYERS) {
                        // Buyer doesn't have access
                        await expectPurchaseThrow(
                            id,
                            amountToPurchase,
                            purchasePrice,
                            "SomeKey" + getRandom(),
                            sendValue,
                            buyer,
                            "AccessList: Caller doesn't have access",
                        );
                    } else if (currentPrice > purchasePrice) {
                        // Buyer overpriced
                        await expectPurchaseThrow(
                            id,
                            amountToPurchase,
                            purchasePrice,
                            "SomeKey" + getRandom(),
                            sendValue,
                            buyer,
                            "Current price is higher than limit price",
                        );
                    } else {
                        // Normal case

                        const startTokenId = raritiesConfig[id].startTokenId + auction.rarityNumMinted[id];

                        actualAmountPurchased = await auction.purchase(
                            id,
                            amountToPurchase,
                            purchasePrice,
                            "SomeKey" + getRandom(),
                            sendValue,
                            buyer,
                        );

                        addTokenRange(buyerIndex, startTokenId, startTokenId + actualAmountPurchased - 1);
                    }

                    if (getPercent() <= 3) {
                        await auction.NFTPotionFunds.sendUnrequestedFunds(
                            getRandom() % 1000000,
                            signers[getRandom() % MAX_BUYERS],
                        );
                    }

                    const newPrice = Math.max(currentPrice - getRandom() * 15, 0);
                    await auction.changePrice(id, newPrice);

                    if (getPercent() <= 1) {
                        await auction.NFTPotionFunds.transferFunds(signers[getRandom() % MAX_BUYERS].address);
                    }

                    totalAvailable -= actualAmountPurchased;
                }

                totalNFTsAllRarities += totalItemsRarity;

                expect(buyersTokenIDs.flat(1).length).to.be.equal(totalNFTsAllRarities);
                expect(await auction.getRemainingNFTs(ITEMS_IDS[i])).to.equal(0);

                process.stdout.write(`\t    [Rarity ${i + 1}/${ITEMS_IDS.length} ID=${id}]: 100%             \n`);

                // Auction ends
                await auction.stopAuction();
            }

            // Auction transfer funds
            await auction.NFTPotionFunds.transferFunds(signers[getRandom() % MAX_BUYERS].address);
        }).timeout(600000);
        it.skip(`Input Data Gas Limit`, async function () {
            let proofs = [];
            for (let i = 0; i < 29; i++) {
                proofs.push([
                    "0x0000000000000000000000000000000000000000000000000000000000000000",
                    "0x1111111111111111111111111111111111111111111111111111111111111111",
                    "0x2222222222222222222222222222222222222222222222222222222222222222",
                    "0x3333333333333333333333333333333333333333333333333333333333333333",
                    "0x4444444444444444444444444444444444444444444444444444444444444444",
                    "0x5555555555555555555555555555555555555555555555555555555555555555",
                    "0x6666666666666666666666666666666666666666666666666666666666666666",
                    "0x7777777777777777777777777777777777777777777777777777777777777777",
                    "0x8888888888888888888888888888888888888888888888888888888888888888",
                    "0x9999999999999999999999999999999999999999999999999999999999999999",
                    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                    "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                    "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
                    "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
                    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                    "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
                ]);
                // proofs.push([
                //     "0x0000000000000000000000000000000000000000000000000000000000000000",
                //     "0x0000000000000000000000000000000000000000000000000000000000000000",
                //     "0x0000000000000000000000000000000000000000000000000000000000000000",
                //     "0x0000000000000000000000000000000000000000000000000000000000000000",
                //     "0x0000000000000000000000000000000000000000000000000000000000000000",
                //     "0x0000000000000000000000000000000000000000000000000000000000000000",
                //     "0x0000000000000000000000000000000000000000000000000000000000000000",
                //     "0x0000000000000000000000000000000000000000000000000000000000000000",
                //     "0x0000000000000000000000000000000000000000000000000000000000000000",
                //     "0x0000000000000000000000000000000000000000000000000000000000000000",
                //     "0x0000000000000000000000000000000000000000000000000000000000000000",
                //     "0x0000000000000000000000000000000000000000000000000000000000000000",
                //     "0x0000000000000000000000000000000000000000000000000000000000000000",
                //     "0x0000000000000000000000000000000000000000000000000000000000000000",
                //     "0x0000000000000000000000000000000000000000000000000000000000000000",
                //     "0x0000000000000000000000000000000000000000000000000000000000000000",
                //     "0x0000000000000000000000000000000000000000000000000000000000000000",
                // ]);
            }

            // Validate list
            const gasEstimation = fromBN(await NFTValidatorV2.estimateGas.validateList(proofs));
            console.log(gasEstimation);

            const tx = await NFTValidatorV2.populateTransaction.validateList(proofs);
            console.log(tx);
            console.log(tx.data.length);

            await NFTValidatorV2.validateList(proofs);
        });

        it(`NFT Validation`, async function () {
            const MAX_IDS_BATCH_VALIDATION = 25;

            // Validate token ID
            const potionGenesis = getPotionGenesis();
            const rarityConfig = getRaritiesConfig();
            const { merkleTree, leaves } = buildMerkleTree(potionGenesis, rarityConfig);

            const totalIDs = buyersTokenIDs.flat(1).length;
            let finalMessage = Buffer.alloc(potionGenesis.length, 0);

            let processedIds = 0;

            console.log("\t[NFT Validation]");

            // Validate
            for (let buyerIndex = 0; buyerIndex < buyersTokenIDs.length; buyerIndex++) {
                const tokenIDs = buyersTokenIDs[buyerIndex];
                const buyer = signers[buyerIndex];

                // Choose how many to validate
                while (buyersTokenIDs[buyerIndex].length > 0) {
                    const numTokensValidate = Math.min(tokenIDs.length, MAX_IDS_BATCH_VALIDATION);
                    const validationIDs = buyersTokenIDs[buyerIndex].splice(0, numTokensValidate);

                    let secretPieces = [];
                    let proofs = [];

                    for (const tokenID of validationIDs) {
                        proofs.push(getMerkleProofWithTree(tokenID, merkleTree, leaves));
                        secretPieces.push(bufferToHex(getSecretPieceFromId(tokenID, potionGenesis, rarityConfig)));
                    }

                    // Validate list
                    const tx = await NFTValidatorV2.connect(buyer).validateList(validationIDs, secretPieces, proofs);

                    // Validate the events
                    for (let i = 0; i < validationIDs.length; i++) {
                        const tokenID = validationIDs[i];
                        const secretPiece = secretPieces[i];

                        const { start } = getSecretStartAndLength(tokenID, rarityConfig);

                        await expect(tx)
                            .to.emit(NFTValidatorV2, "NFTValidated")
                            .withArgs(buyer.address, toBN(tokenID), toBN(start), secretPiece);

                        // Copy the secret to final message
                        Buffer.from(secretPiece.slice(2), "hex").copy(finalMessage, start);
                    }

                    processedIds += validationIDs.length;

                    process.stdout.write(
                        `\t    Progress: ${Math.floor((100 * processedIds) / totalIDs)}%                   \r`,
                    );
                }
            }

            // Validate the final message
            expect(potionGenesis).to.be.equalBytes(finalMessage);

            process.stdout.write(`\t    Progress: 100%                   \n`);
        }).timeout(6000000);
    });
});

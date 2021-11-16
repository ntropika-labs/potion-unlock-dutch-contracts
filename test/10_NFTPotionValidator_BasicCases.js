const { expect } = require("chai").use(require("chai-bytes"));
const { ethers } = require("hardhat");
const { deployPotionNFTGame } = require("../scripts/deployUtils");
const { getMerkleProof } = require("../scripts/merkleUtils");
const { getSecretPieceFromId, getPotionGenesis, getRaritiesConfig } = require("../scripts/lib/utils");
const { range } = require("./testUtils");

async function mintTokens(NFTAuction, NFTPotion, firstId, lastId, owner, increment = 1, single = false) {
    // Whitelist token IDs
    await NFTAuction.whitelistBidders([owner.address], [lastId - firstId + 1], [firstId]);

    // Mint token IDs
    const tokenList = range(firstId, lastId);
    if (single) {
        for (let i = 0; i < tokenList.length; i += increment) {
            await NFTPotion.mint(tokenList[i], "TestPublicKey");
        }
    } else {
        await NFTPotion.mintList(tokenList, "TestPublicKey");
    }
}

describe("NFTPotioValidator", function () {
    describe.only("Basic Cases", function () {
        let NFTAuction, NFTPotion, NFTValidator;

        // Initialize the contract
        beforeEach(async function () {
            ({ NFTAuction, NFTPotion, NFTValidator } = await deployPotionNFTGame(false, false));
        });

        it("Merkle single validation, first to last", async function () {
            const FIRST_TOKEN_ID = 1;
            const NUM_TOKENS = 10000;
            const INCREMENT = 50;

            const signers = await ethers.getSigners();

            await mintTokens(
                NFTAuction,
                NFTPotion,
                FIRST_TOKEN_ID,
                FIRST_TOKEN_ID + NUM_TOKENS - 1,
                signers[0],
                INCREMENT,
                true,
            );

            // Validate token ID
            const potionGenesis = getPotionGenesis();
            const rarityConfig = getRaritiesConfig();

            const tokenList = range(FIRST_TOKEN_ID, FIRST_TOKEN_ID + NUM_TOKENS - 1);

            // Validate
            for (let i = 0; i < tokenList.length; i += INCREMENT) {
                const proof = getMerkleProof(tokenList[i]);
                const secretPiece = getSecretPieceFromId(tokenList[i], potionGenesis, rarityConfig);

                await NFTValidator.validate(tokenList[i], secretPiece, proof);

                const finalMessage = Buffer.from((await NFTValidator.finalMessage()).substr(2), "hex");
                const decryptedPiece = getSecretPieceFromId(tokenList[i], finalMessage, rarityConfig);

                expect(decryptedPiece).to.be.equalBytes(secretPiece);

                process.stdout.write(`\tProgress: ${Math.floor((100 * i) / tokenList.length)}%                   \r`);
            }

            process.stdout.write(`\tProgress: 100%                   \r\n`);

            // Check
            const finalMessage = Buffer.from((await NFTValidator.finalMessage()).substr(2), "hex");

            for (let i = 0; i < tokenList.length; i += INCREMENT) {
                const secretPiece = getSecretPieceFromId(tokenList[i], potionGenesis, rarityConfig);
                const decryptedPiece = getSecretPieceFromId(tokenList[i], finalMessage, rarityConfig);

                expect(decryptedPiece).to.be.equalBytes(secretPiece);
            }
        }).timeout(200000);

        it("Merkle single validation, last to first", async function () {
            const FIRST_TOKEN_ID = 1;
            const NUM_TOKENS = 10000;
            const INCREMENT = 50;

            const signers = await ethers.getSigners();

            await mintTokens(
                NFTAuction,
                NFTPotion,
                FIRST_TOKEN_ID,
                FIRST_TOKEN_ID + NUM_TOKENS - 1,
                signers[0],
                INCREMENT,
                true,
            );

            // Validate token ID
            const potionGenesis = getPotionGenesis();
            const rarityConfig = getRaritiesConfig();

            const tokenList = range(FIRST_TOKEN_ID, FIRST_TOKEN_ID + NUM_TOKENS - 1).reverse();

            // Validate
            for (let i = 0; i < tokenList.length; i += INCREMENT) {
                const proof = getMerkleProof(tokenList[i]);
                const secretPiece = getSecretPieceFromId(tokenList[i], potionGenesis, rarityConfig);

                await NFTValidator.validate(tokenList[i], secretPiece, proof);

                const finalMessage = Buffer.from((await NFTValidator.finalMessage()).substr(2), "hex");
                const decryptedPiece = getSecretPieceFromId(tokenList[i], finalMessage, rarityConfig);

                expect(decryptedPiece).to.be.equalBytes(secretPiece);

                process.stdout.write(`\tProgress: ${Math.floor((100 * i) / tokenList.length)}%                   \r`);
            }

            process.stdout.write(`\tProgress: 100%                   \r\n`);

            // Check
            const finalMessage = Buffer.from((await NFTValidator.finalMessage()).substr(2), "hex");

            for (let i = 0; i < tokenList.length; i++) {
                const secretPiece = getSecretPieceFromId(tokenList[i], potionGenesis, rarityConfig);
                const decryptedPiece = getSecretPieceFromId(tokenList[i], finalMessage, rarityConfig);

                expect(decryptedPiece).to.be.equalBytes(secretPiece);
            }
        }).timeout(200000);

        it("Merkle multiple validation", async function () {
            const FIRST_TOKEN_ID = 1;
            const NUM_TOKENS = 10000;
            const INCREMENT = 50;
            const NUM_VALIDATIONS = 20;

            const signers = await ethers.getSigners();

            await mintTokens(
                NFTAuction,
                NFTPotion,
                FIRST_TOKEN_ID,
                FIRST_TOKEN_ID + NUM_TOKENS - 1,
                signers[0],
                INCREMENT,
                true,
            );

            // Validate token ID
            const potionGenesis = getPotionGenesis();
            const rarityConfig = getRaritiesConfig();

            const fullTokenIdList = range(FIRST_TOKEN_ID, FIRST_TOKEN_ID + NUM_TOKENS - 1);

            let index = 0;
            while (index < fullTokenIdList.length) {
                const secretsList = [];
                const proofsList = [];
                const tokenIdList = [];

                for (let j = 0; j < NUM_VALIDATIONS && index < fullTokenIdList.length; j++, index += INCREMENT) {
                    proofsList.push(getMerkleProof(fullTokenIdList[index]));
                    secretsList.push(getSecretPieceFromId(fullTokenIdList[index], potionGenesis, rarityConfig));
                    tokenIdList.push(fullTokenIdList[index]);
                }

                await NFTValidator.validateList(tokenIdList, secretsList, proofsList);

                process.stdout.write(
                    `\tProgress: ${Math.floor((100 * index) / fullTokenIdList.length)}%                   \r`,
                );
            }

            process.stdout.write(`\tProgress: 100%                   \r\n`);
        }).timeout(200000);
    });
});

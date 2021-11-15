const { expect } = require("chai").use(require("chai-bytes"));
const { ethers } = require("hardhat");
const { bufferToHex } = require("ethereumjs-util");
const { deployPotionNFTGame } = require("../scripts/deployUtils");
const { getMerkleProof } = require("../scripts/merkleUtils");
const { getSecretPieceFromId, getPotionGenesis, getRaritiesConfig } = require("../scripts/lib/utils");
const { range } = require("./testUtils");

async function mintTokens(NFTAuction, NFTPotion, firstId, lastId, owner, single = false) {
    // Whitelist token IDs
    await NFTAuction.whitelistBidders([owner.address], [lastId - firstId + 1], [firstId]);

    // Mint token IDs
    const tokenList = range(firstId, lastId);
    if (single) {
        for (let i = 0; i < tokenList.length; i++) {
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

        it.only("Merkle Single Validation (Several)", async function () {
            const firstTokenId = 1;
            const numTokens = 1073;

            const signers = await ethers.getSigners();

            await mintTokens(NFTAuction, NFTPotion, firstTokenId, firstTokenId + numTokens - 1, signers[0], true);

            // Validate token ID
            const potionGenesis = getPotionGenesis();
            const rarityConfig = getRaritiesConfig();

            const tokenList = range(firstTokenId, firstTokenId + numTokens - 1);

            // Validate
            for (let i = 0; i < tokenList.length; i++) {
                const proof = getMerkleProof(tokenList[i]);
                const secretPiece = getSecretPieceFromId(tokenList[i], potionGenesis, rarityConfig);

                console.log(tokenList[i]);
                await NFTValidator.validate(tokenList[i], secretPiece, proof);

                const finalMessage = Buffer.from((await NFTValidator.finalMessage()).substr(2), "hex");
                const decryptedPiece = getSecretPieceFromId(tokenList[i], finalMessage, rarityConfig);

                expect(decryptedPiece).to.be.equalBytes(secretPiece);
            }

            // Check
            const finalMessage = Buffer.from((await NFTValidator.finalMessage()).substr(2), "hex");

            for (let i = 0; i < tokenList.length; i++) {
                const secretPiece = getSecretPieceFromId(tokenList[i], potionGenesis, rarityConfig);
                const decryptedPiece = getSecretPieceFromId(tokenList[i], finalMessage, rarityConfig);

                expect(decryptedPiece).to.be.equalBytes(secretPiece);
            }
        }).timeout(200000);

        it("Merkle List Validation", async function () {
            const firstTokenId = 1;
            const numTokens = 10;

            const signers = await ethers.getSigners();

            await mintTokens(NFTAuction, NFTPotion, firstTokenId, firstTokenId + numTokens - 1, signers[0]);

            // Validate token ID
            const potionGenesis = getPotionGenesis();
            const rarityConfig = getRaritiesConfig();

            const tokenList = range(firstTokenId, firstTokenId + numTokens - 1);
            const secretsList = [];
            const proofsList = [];

            for (let i = 0; i < tokenList.length; i++) {
                proofsList.push(getMerkleProof(tokenList[i]));
                secretsList.push(getSecretPieceFromId(tokenList[i], potionGenesis, rarityConfig));
            }

            await NFTValidator.validateList(tokenList, secretsList, proofsList);
        });
    });
});

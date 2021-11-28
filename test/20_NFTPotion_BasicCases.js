const { expect } = require("chai").use(require("chai-bytes"));
const { ethers } = require("hardhat");
const { bufferToHex } = require("ethereumjs-util");

const { deployPotionNFTGame } = require("../scripts/deployUtils");
const { NFT_NAME, NFT_SYMBOL, IPFS_PREFIX, IPFS_SUFFIX } = require("../scripts/config");
const { getSecretPieceFromId, getRaritiesConfig } = require("../scripts/lib/utils");
const { range } = require("./testUtils");

describe.skip("NFTPotion", function () {
    describe("Basic Cases", function () {
        let NFTAuction, NFTPotion, NFTValidator, encryptedPassword;

        // Initialize the contract
        beforeEach(async function () {
            ({ NFTAuction, NFTPotion, NFTValidator, encryptedPassword } = await deployPotionNFTGame(false, false));

            encryptedPassword = Buffer.from(encryptedPassword.slice(2), "hex");
        });

        it("Correct deployment", async function () {
            expect(await NFTPotion.symbol()).to.be.equal(NFT_SYMBOL);
            expect(await NFTPotion.name()).to.be.equal(NFT_NAME);
            expect(await NFTPotion.ipfsPrefix()).to.be.equal(IPFS_PREFIX);
            expect(await NFTPotion.ipfsSuffix()).to.be.equal(IPFS_SUFFIX);
        });

        it("Single mint", async function () {
            const FIRST_TOKEN_ID = 1;
            const NUM_TOKENS = 10000;
            const INCREMENT = 50;

            const signers = await ethers.getSigners();

            // Whitelist token IDs
            await NFTAuction.whitelistBidders([signers[0].address], [NUM_TOKENS], [FIRST_TOKEN_ID]);

            // Mint token IDs
            const tokenList = range(FIRST_TOKEN_ID, FIRST_TOKEN_ID + NUM_TOKENS - 1);
            const raritiesConfig = getRaritiesConfig();

            for (let i = 0; i < tokenList.length; i += INCREMENT) {
                await NFTPotion.mint(tokenList[i], "TestPublicKey" + i);

                const tokenURI = await NFTPotion.tokenURI(tokenList[i]);
                expect(tokenURI).to.equal(IPFS_PREFIX + tokenList[i] + IPFS_SUFFIX);

                const publicKey = await NFTPotion.encryptionKeys(tokenList[i]);
                expect(publicKey).to.equal("TestPublicKey" + i);

                const contractSecret = await NFTPotion.secret(tokenList[i]);
                const secretPiece = await getSecretPieceFromId(tokenList[i], encryptedPassword, raritiesConfig);
                expect(contractSecret).to.be.equal(bufferToHex(secretPiece));
            }
        });

        it("Batch mint", async function () {
            const FIRST_TOKEN_ID = 1;
            const NUM_TOKENS = 10000;
            const INCREMENT = 50;

            const signers = await ethers.getSigners();

            // Whitelist token IDs
            await NFTAuction.whitelistBidders([signers[0].address], [NUM_TOKENS], [FIRST_TOKEN_ID]);

            // Mint token IDs
            const tokenList = range(FIRST_TOKEN_ID, FIRST_TOKEN_ID + NUM_TOKENS - 1);

            const finalTokenIdList = [];
            for (let i = 0; i < tokenList.length; i += INCREMENT) {
                finalTokenIdList.push(tokenList[i]);
            }

            await NFTPotion.mintList(finalTokenIdList, "UniquePublicKey");

            for (let i = 0; i < finalTokenIdList.length; i++) {
                const tokenURI = await NFTPotion.tokenURI(finalTokenIdList[i]);
                expect(tokenURI).to.equal(IPFS_PREFIX + finalTokenIdList[i] + IPFS_SUFFIX);

                const publicKey = await NFTPotion.encryptionKeys(finalTokenIdList[i]);
                expect(publicKey).to.equal("UniquePublicKey");
            }
        });
    });
});

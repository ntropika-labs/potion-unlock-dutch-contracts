const { expect } = require("chai").use(require("chai-bytes"));
const { ethers } = require("hardhat");
const { deployPotionNFTGame } = require("../scripts/deployUtils");
const { NFT_NAME, NFT_SYMBOL, NUM_NFTS, IPFS_PREFIX, IPFS_SUFFIX } = require("../scripts/config");
const { range } = require("./testUtils");

describe("NFTPotion", function () {
    describe("Basic Cases", function () {
        let NFTAuction, NFTPotion;

        // Initialize the contract
        beforeEach(async function () {
            ({ NFTAuction, NFTPotion } = await deployPotionNFTGame(false, false));
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

            for (let i = 0; i < tokenList.length; i += INCREMENT) {
                await NFTPotion.mint(tokenList[i], "TestPublicKey");

                const tokenURI = await NFTPotion.tokenURI(tokenList[i]);

                expect(tokenURI).to.equal(IPFS_PREFIX + tokenList[i] + IPFS_SUFFIX);
            }
        });
    });
});

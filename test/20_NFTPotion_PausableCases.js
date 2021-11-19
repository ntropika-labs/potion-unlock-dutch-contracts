const { expect } = require("chai").use(require("chai-bytes"));
const { ethers } = require("hardhat");

const { deployPotionNFTGame } = require("../scripts/deployUtils");

describe("NFTPotion", function () {
    describe("Pausable Cases", function () {
        let NFTAuction, NFTPotion, NFTValidator, encryptedPassword;

        // Initialize the contract
        beforeEach(async function () {
            ({ NFTAuction, NFTPotion, NFTValidator, encryptedPassword } = await deployPotionNFTGame(false, false));
        });
        it("Non-owners cannot pause/unpause the contract", async function () {
            const signers = await ethers.getSigners();

            await expect(NFTPotion.connect(signers[1]).pause()).to.be.revertedWith("Ownable: caller is not the owner");
            await expect(NFTPotion.connect(signers[1]).unpause()).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
        });
        it("While paused, non-owner functions cannot be called", async function () {
            const FIRST_TOKEN_ID = 1;
            const NUM_TOKENS = 10000;

            const signers = await ethers.getSigners();

            // Whitelist token IDs
            await NFTAuction.whitelistBidders([signers[1].address], [NUM_TOKENS], [FIRST_TOKEN_ID]);

            await NFTPotion.pause();
            await expect(NFTPotion.connect(signers[1]).mint(1, "TestPublicKey")).to.be.revertedWith("Pausable: paused");
            await expect(NFTPotion.connect(signers[1]).mintList([2, 3, 4, 5], "TestPublicKey")).to.be.revertedWith(
                "Pausable: paused",
            );
            await NFTPotion.unpause();
        });
    });
});

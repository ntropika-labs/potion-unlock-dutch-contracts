const { expect } = require("chai").use(require("chai-bytes"));
const { ethers } = require("hardhat");

const { deployPotionNFTGame } = require("../scripts/deployUtils");

describe("NFTPotionValidator", function () {
    describe.only("Pausable Cases", function () {
        let NFTAuction, NFTPotion, NFTValidator;

        // Initialize the contract
        beforeEach(async function () {
            ({ NFTAuction, NFTPotion, NFTValidator } = await deployPotionNFTGame(false, false));
        });
        it("Non-owners cannot pause/unpause the contract", async function () {
            const signers = await ethers.getSigners();

            await expect(NFTValidator.connect(signers[1]).pause()).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            await expect(NFTValidator.connect(signers[1]).unpause()).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
        });
        it("While paused, non-owner functions cannot be called", async function () {
            const signers = await ethers.getSigners();

            // Whitelist token IDs
            await NFTAuction.whitelistBidders([signers[1].address], [10], [1]);

            await NFTValidator.pause();
            await expect(NFTValidator.connect(signers[1]).validate(1, "0x012381628736127367", [])).to.be.revertedWith(
                "Pausable: paused",
            );
            await expect(
                NFTValidator.connect(signers[1]).validateList(
                    [2, 3, 4, 5],
                    ["0x012381628736127367", "0x012381628736127367", "0x012381628736127367", "0x012381628736127367"],
                    [[], [], [], []],
                ),
            ).to.be.revertedWith("Pausable: paused");
            await NFTValidator.unpause();
        });
    });
});

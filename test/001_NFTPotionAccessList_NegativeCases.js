const { before } = require("mocha");
const { ethers } = require("hardhat");

const { NFTPotionHelper } = require("./NFTPotionHelper");
const { getRaritiesConfig } = require("../scripts/lib/utils");
const { expectThrow } = require("./testUtils");
const { deployNFTContract, deployMockUSDC } = require("../scripts/deployUtils");

describe("NFTPotionAccessList", function () {
    describe("Negative Cases", function () {
        let auction;
        let signers;
        let raritiesConfig;
        let owner;
        let USDC;

        before(async function () {
            signers = await ethers.getSigners();
            raritiesConfig = getRaritiesConfig();
            owner = signers[0];

            USDC = await deployMockUSDC();

            for (const signer of signers) {
                await USDC.mint(signer.address, ethers.utils.parseEther("100"));
            }
        });

        // Initialize the contract
        beforeEach(async function () {
            let NFTPotion;
            ({ NFTPotion } = await deployNFTContract(USDC, true));

            auction = new NFTPotionHelper(NFTPotion, USDC);
            await auction.initialize();
        });

        describe("Set access for one", function () {
            it("Only owner can set access", async function () {
                await expectThrow(
                    async () => auction.NFTPotionAccessList.setAccess(signers[1].address, true, signers[1]),
                    "Ownable: caller is not the owner",
                );
                await expectThrow(
                    async () => auction.NFTPotionAccessList.setAccess(signers[1].address, false, signers[1]),
                    "Ownable: caller is not the owner",
                );

                await expectThrow(
                    async () => auction.NFTPotionAccessList.setAccess(owner.address, true, signers[1]),
                    "Ownable: caller is not the owner",
                );

                await expectThrow(
                    async () => auction.NFTPotionAccessList.setAccess(owner.address, false, signers[1]),
                    "Ownable: caller is not the owner",
                );
            });
        });
        describe("Set access for several", function () {
            it("Only owner can set access", async function () {
                await expectThrow(
                    async () => auction.NFTPotionAccessList.setAccessAll([signers[1].address], [true], signers[1]),
                    "Ownable: caller is not the owner",
                );
                await expectThrow(
                    async () => auction.NFTPotionAccessList.setAccessAll([signers[1].address], [false], signers[1]),
                    "Ownable: caller is not the owner",
                );

                await expectThrow(
                    async () =>
                        auction.NFTPotionAccessList.setAccessAll([owner.address, signers[2].address], true, signers[1]),
                    "Ownable: caller is not the owner",
                );

                await expectThrow(
                    async () =>
                        auction.NFTPotionAccessList.setAccessAll(
                            [owner.address, signers[2].address],
                            false,
                            signers[1],
                        ),
                    "Ownable: caller is not the owner",
                );
            });
        });
    });
});

const { before } = require("mocha");
const { ethers } = require("hardhat");

const { expectThrow, deployUSDCContract, deployDutchAuctionContracts } = require("./testUtils");

describe("NFTPotionAccessList", function () {
    describe("Negative Cases", function () {
        let auction;
        let signers;
        let owner;
        let USDC;

        before(async function () {
            signers = await ethers.getSigners();
            owner = signers[0];

            USDC = await deployUSDCContract(signers, "100");
        });

        // Initialize the contract
        beforeEach(async function () {
            auction = await deployDutchAuctionContracts(USDC);
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

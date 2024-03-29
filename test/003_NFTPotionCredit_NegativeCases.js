const { before } = require("mocha");
const { ethers } = require("hardhat");

const { NFTPotionHelper } = require("./NFTPotionHelper");
const { getRaritiesConfig } = require("../scripts/lib/utils");
const { expectThrow } = require("./testUtils");
const { deployNFTContract, deployMockUSDC } = require("../scripts/deployUtils");

describe("NFTPotionCredit", function () {
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

        describe("Add credit for one", function () {
            it("Only owner can add credit", async function () {
                await expectThrow(
                    async () => auction.NFTPotionCredit.addCredit(signers[1].address, 0, 10, signers[1]),
                    "Ownable: caller is not the owner",
                );
                await expectThrow(
                    async () => auction.NFTPotionCredit.addCredit(signers[1].address, 1, 20, signers[2]),
                    "Ownable: caller is not the owner",
                );

                await expectThrow(
                    async () => auction.NFTPotionCredit.addCredit(signers[0].address, 5, 1, signers[3]),
                    "Ownable: caller is not the owner",
                );

                await expectThrow(
                    async () => auction.NFTPotionCredit.addCredit(signers[5].address, 4, 3, signers[4]),
                    "Ownable: caller is not the owner",
                );
            });
        });
        describe("Add credit for several", function () {
            it("Only owner can add credit", async function () {
                await expectThrow(
                    async () => auction.NFTPotionCredit.addCreditAll([signers[1].address], [0], [10], signers[1]),
                    "Ownable: caller is not the owner",
                );
                await expectThrow(
                    async () =>
                        auction.NFTPotionCredit.addCreditAll(
                            [signers[1].address, signers[2].address],
                            [1, 2],
                            [20, 20],
                            signers[2],
                        ),
                    "Ownable: caller is not the owner",
                );

                await expectThrow(
                    async () =>
                        auction.NFTPotionCredit.addCreditAll(
                            [signers[0].address, signers[1].address, signers[3].address],
                            [4, 5, 5],
                            [1, 20, 100],
                            signers[3],
                        ),
                    "Ownable: caller is not the owner",
                );
            });
            it("Input data must be consistent", async function () {
                await expectThrow(
                    async () => auction.NFTPotionCredit.addCreditAll([], [], []),
                    "Trying to add credit with empty array",
                );
                await expectThrow(
                    async () => auction.NFTPotionCredit.addCreditAll([], [2], []),
                    "Trying to add credit with empty array",
                );
                await expectThrow(
                    async () => auction.NFTPotionCredit.addCreditAll([], [], [5]),
                    "Trying to add credit with empty array",
                );
                await expectThrow(
                    async () => auction.NFTPotionCredit.addCreditAll([], [6], [89]),
                    "Trying to add credit with empty array",
                );
                await expectThrow(
                    async () => auction.NFTPotionCredit.addCreditAll([signers[0].address], [], []),
                    "Mismatch in array sizes for adding credit",
                );
                await expectThrow(
                    async () => auction.NFTPotionCredit.addCreditAll([signers[0].address], [7], []),
                    "Mismatch in array sizes for adding credit",
                );
                await expectThrow(
                    async () => auction.NFTPotionCredit.addCreditAll([signers[0].address], [], [89]),
                    "Mismatch in array sizes for adding credit",
                );
            });
        });
    });
});

const { expect } = require("chai");
const { before } = require("mocha");
const { ethers } = require("hardhat");

const { NFTPotionV2Helper } = require("./NFTPotionV2Helper");
const { toBN, fromBN } = require("./NFTPotionAuctionUtils");
const { getRaritiesConfig } = require("../scripts/lib/utils");
const { expectThrow } = require("./testUtils");

describe.only("NFTPotionCredit", function () {
    describe.skip("Negative Cases", function () {
        let auction;
        let signers;
        let raritiesConfig;
        let owner;

        before(async function () {
            signers = await ethers.getSigners();
            raritiesConfig = getRaritiesConfig();
            owner = signers[0];
        });

        // Initialize the contract
        beforeEach(async function () {
            auction = new NFTPotionV2Helper();
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
        });
    });
});

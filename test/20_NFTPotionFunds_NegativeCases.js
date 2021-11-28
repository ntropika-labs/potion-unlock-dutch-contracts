const { expect } = require("chai");
const { before } = require("mocha");
const { ethers } = require("hardhat");

const { NFTPotionV2Helper } = require("./NFTPotionV2Helper");
const { toBN, fromBN } = require("./NFTPotionAuctionUtils");
const { getRaritiesConfig } = require("../scripts/lib/utils");
const { expectThrow } = require("./testUtils");

describe.only("NFTPotionCredit", function () {
    describe("Negative Cases", function () {
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

        describe.only("Transfer funds", function () {
            it("Only owner can transfer funds", async function () {
                await expectThrow(
                    async () => auction.NFTPotionFunds.transferFunds(signers[1].address, signers[1]),
                    "Ownable: caller is not the owner",
                );
                await expectThrow(
                    async () => auction.NFTPotionFunds.transferFunds(signers[1].address, signers[2]),
                    "Ownable: caller is not the owner",
                );

                await expectThrow(
                    async () => auction.NFTPotionFunds.transferFunds(signers[0].address, signers[3]),
                    "Ownable: caller is not the owner",
                );
            });
        });
    });
});

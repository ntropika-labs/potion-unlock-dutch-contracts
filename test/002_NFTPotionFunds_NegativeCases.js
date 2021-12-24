const { before } = require("mocha");
const { ethers } = require("hardhat");

const { expectThrow, deployUSDCContract, deployDutchAuctionContracts } = require("./testUtils");
const { toBN } = require("./NFTPotionAuctionUtils");

describe("NFTPotionFunds", function () {
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

        describe("Transfer funds", function () {
            it("Only owner can transfer funds", async function () {
                await expectThrow(
                    async () => auction.NFTPotionFunds.transferFunds(signers[1].address, undefined, signers[1]),
                    "Ownable: caller is not the owner",
                );
                await expectThrow(
                    async () => auction.NFTPotionFunds.transferFunds(signers[1].address, undefined, signers[2]),
                    "Ownable: caller is not the owner",
                );

                await expectThrow(
                    async () => auction.NFTPotionFunds.transferFunds(signers[0].address, undefined, signers[3]),
                    "Ownable: caller is not the owner",
                );
            });
            it("Transfer more funds than available", async function () {
                const NUM_PURCHASES = 100;

                await auction.startAuction(0, 100);

                const purchasePriceBN = toBN(await auction.purchasePrice());

                await auction.NFTPotionAccessList.setAccess(owner.address, true);

                await auction.purchase(0, NUM_PURCHASES, purchasePriceBN, "Some Public Key");

                const totalFunds = purchasePriceBN.mul(NUM_PURCHASES);
                const exceedTotalFunds = totalFunds.add(toBN(10000000));

                await expectThrow(
                    async () => auction.NFTPotionFunds.transferFunds(owner.address, exceedTotalFunds),
                    "ERC20: transfer amount exceeds balance",
                );
            });
        });
    });
});

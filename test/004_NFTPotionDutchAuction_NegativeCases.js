const { expect } = require("chai");
const { before } = require("mocha");
const { ethers } = require("hardhat");

const { NFTPotionHelper } = require("./NFTPotionHelper");
const { deployNFTContract, deployMockUSDC } = require("../scripts/deployUtils");
const { toBN } = require("./NFTPotionAuctionUtils");
const { getRaritiesConfig } = require("../scripts/lib/utils");
const { expectThrow } = require("./testUtils");

describe("NFTPotionDutchAuction", function () {
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

            for (const signer of signers) {
                await USDC.mint(signer.address, ethers.utils.parseEther("100"));
            }
        });

        describe("Start Auction", function () {
            it("Only owner can start auction", async function () {
                await expectThrow(
                    async () => auction.startAuction(1, 100, signers[1]),
                    "Ownable: caller is not the owner",
                );
                await expectThrow(
                    async () => auction.startAuction(1, 100, signers[1]),
                    "Ownable: caller is not the owner",
                );
                await expectThrow(
                    async () => auction.startAuction(1, 100, signers[1]),
                    "Ownable: caller is not the owner",
                );
            });
            it("Start auction for invalid rarity ID", async function () {
                const maxID = raritiesConfig.length - 1;

                await expectThrow(async () => auction.startAuction(maxID + 10, 100), "Invalid rarity ID");
                await expectThrow(async () => auction.startAuction(maxID + 3, 100), "Invalid rarity ID");
                await expectThrow(async () => auction.startAuction(maxID + 1, 100), "Invalid rarity ID");
            });
            it("Start auction when another auction is running", async function () {
                await auction.startAuction(0, 100);

                await expectThrow(async () => auction.startAuction(0, 100), "Auction is already active");
                await expectThrow(async () => auction.startAuction(1, 10), "Auction is already active");
            });
            it("Start auction all items have been sold", async function () {
                const PURCHASE_AT_ONCE = 100;

                await auction.startAuction(0, 100);

                let remainingItems = await auction.getRemainingNFTs(0);
                const purchasePriceBN = toBN(await auction.purchasePrice());

                await auction.NFTPotionAccessList.setAccess(owner.address, true);

                for (; remainingItems >= PURCHASE_AT_ONCE; remainingItems -= PURCHASE_AT_ONCE) {
                    await auction.purchase(0, PURCHASE_AT_ONCE, purchasePriceBN, "Some Public Key");
                }
                if (remainingItems > 0) {
                    await auction.purchase(0, remainingItems, purchasePriceBN, "Some Public Key");
                }

                remainingItems = await auction.getRemainingNFTs(0);
                expect(remainingItems).to.equal(0);

                await auction.stopAuction();

                await expectThrow(async () => auction.startAuction(0, 100), "Rarity is already sold out");
            });
        });
        describe("Stop Auction", function () {
            it("Only owner can stop auction", async function () {
                await auction.startAuction(2, 495);

                await expectThrow(async () => auction.stopAuction(signers[2]), "Ownable: caller is not the owner");
                await expectThrow(async () => auction.stopAuction(signers[3]), "Ownable: caller is not the owner");
                await expectThrow(async () => auction.stopAuction(signers[2]), "Ownable: caller is not the owner");
            });
        });
        describe("Change Price", function () {
            it("Only owner can change price", async function () {
                await auction.startAuction(2, 495);

                await expectThrow(
                    async () => auction.changePrice(2, 500, signers[2]),
                    "Ownable: caller is not the owner",
                );
                await expectThrow(
                    async () => auction.changePrice(2, 500, signers[3]),
                    "Ownable: caller is not the owner",
                );
                await expectThrow(
                    async () => auction.changePrice(2, 500, signers[4]),
                    "Ownable: caller is not the owner",
                );
            });
            it("Cannot change price if no auction is active", async function () {
                await expectThrow(async () => auction.changePrice(0, 500), "Auction is not active");
                await expectThrow(async () => auction.changePrice(1, 500), "Auction is not active");
                await expectThrow(async () => auction.changePrice(2, 500), "Auction is not active");
            });
            it("Cannot change price for a different auction ID", async function () {
                await auction.startAuction(2, 123);

                await expectThrow(async () => auction.changePrice(0, 500), "Active auction ID mismatch");
                await expectThrow(async () => auction.changePrice(1, 500), "Active auction ID mismatch");
                await expectThrow(async () => auction.changePrice(4, 500), "Active auction ID mismatch");
            });
        });
        describe("Purchase", function () {
            it("Auction must be active", async function () {
                const currentPriceBN = toBN(await auction.purchasePrice());

                await expectThrow(
                    async () => auction.purchase(0, 1, currentPriceBN, "TestKey", signers[2]),
                    "Auction is not active",
                );
                await expectThrow(
                    async () => auction.purchase(1, 1, currentPriceBN, "TestKey", signers[3]),
                    "Auction is not active",
                );
                await expectThrow(
                    async () => auction.purchase(2, 1, currentPriceBN, "TestKey", signers[4]),
                    "Auction is not active",
                );
            });
            it("Auction ID must match", async function () {
                await auction.startAuction(1, 123);
                const currentPriceBN = toBN(await auction.purchasePrice());

                await auction.NFTPotionAccessList.setAccess(signers[2].address, true);
                await auction.NFTPotionAccessList.setAccess(signers[3].address, true);
                await auction.NFTPotionAccessList.setAccess(signers[4].address, true);

                await expectThrow(
                    async () => auction.purchase(0, 1, currentPriceBN, "TestKey", undefined, signers[2]),
                    "Active auction ID mismatch",
                );
                await expectThrow(
                    async () => auction.purchase(2, 1, currentPriceBN, "TestKey", undefined, signers[3]),
                    "Active auction ID mismatch",
                );
                await expectThrow(
                    async () => auction.purchase(3, 1, currentPriceBN, "TestKey", undefined, signers[4]),
                    "Active auction ID mismatch",
                );
            });
            it("Caller must have access to purchase", async function () {
                await auction.startAuction(1, 123);
                const currentPriceBN = toBN(await auction.purchasePrice());

                await expectThrow(
                    async () => auction.purchase(1, 1, currentPriceBN, "TestKey", undefined, signers[2]),
                    "AccessList: Caller doesn't have access",
                );
                await expectThrow(
                    async () => auction.purchase(1, 1, currentPriceBN, "TestKey", undefined, signers[3]),
                    "AccessList: Caller doesn't have access",
                );
                await expectThrow(
                    async () => auction.purchase(1, 1, currentPriceBN, "TestKey", undefined, signers[4]),
                    "AccessList: Caller doesn't have access",
                );
            });
            it("Auction not sold out", async function () {
                const PURCHASE_AT_ONCE = 100;

                await auction.startAuction(0, 100);

                let remainingItems = await auction.getRemainingNFTs(0);
                const purchasePriceBN = toBN(await auction.purchasePrice());

                await auction.NFTPotionAccessList.setAccess(owner.address, true);

                for (; remainingItems >= PURCHASE_AT_ONCE; remainingItems -= PURCHASE_AT_ONCE) {
                    await auction.purchase(0, PURCHASE_AT_ONCE, purchasePriceBN, "Some Public Key");
                }
                if (remainingItems > 0) {
                    await auction.purchase(0, remainingItems, purchasePriceBN, "Some Public Key");
                }

                remainingItems = await auction.getRemainingNFTs(0);
                expect(remainingItems).to.equal(0);

                await expectThrow(
                    async () => auction.purchase(0, 1, purchasePriceBN, "Some Public Key"),
                    "Rarity is already sold out",
                );
            });
            it("Purchase with a limit price below current price", async function () {
                await auction.startAuction(1, 456);
                const currentPrice = await auction.purchasePrice();

                await auction.NFTPotionAccessList.setAccess(signers[2].address, true);
                await auction.NFTPotionAccessList.setAccess(signers[3].address, true);
                await auction.NFTPotionAccessList.setAccess(signers[4].address, true);

                await expectThrow(
                    async () => auction.purchase(1, 1, currentPrice - 1, "TestKey", undefined, signers[2]),
                    "Current price is higher than limit price",
                );
                await expectThrow(
                    async () => auction.purchase(1, 1, currentPrice - 2, "TestKey", undefined, signers[3]),
                    "Current price is higher than limit price",
                );
                await expectThrow(
                    async () => auction.purchase(1, 1, currentPrice - 3, "TestKey", undefined, signers[4]),
                    "Current price is higher than limit price",
                );
            });
            it("Don't approve enough cash for payment", async function () {
                await auction.startAuction(2, 25);
                const currentPrice = await auction.purchasePrice();

                await auction.NFTPotionAccessList.setAccess(signers[2].address, true);
                await auction.NFTPotionAccessList.setAccess(signers[3].address, true);
                await auction.NFTPotionAccessList.setAccess(signers[4].address, true);

                await expectThrow(
                    async () => auction.purchase(2, 1, currentPrice, "TestKey", currentPrice - 1, signers[2]),
                    "ERC20: transfer amount exceeds allowance",
                );
                await expectThrow(
                    async () => auction.purchase(2, 10, currentPrice, "TestKey", currentPrice * 10 - 1, signers[3]),
                    "ERC20: transfer amount exceeds allowance",
                );
                await expectThrow(
                    async () => auction.purchase(2, 15, currentPrice, "TestKey", currentPrice * 15 - 1, signers[4]),
                    "ERC20: transfer amount exceeds allowance",
                );
            });
        });
    });
});

const { expect } = require("chai");
const { before } = require("mocha");
const { ethers } = require("hardhat");

const { NFTPotionV2Helper } = require("./NFTPotionV2Helper");
const { getRaritiesConfig } = require("../scripts/lib/utils");

describe("NFTPotionDutchAuction", function () {
    describe("Lyfecycle Cases", function () {
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

        describe("Basic Cases", function () {
            it("Add to access list", async function () {
                for (let i = 0; i < 15; i++) {
                    await auction.NFTPotionAccessList.setAccess(signers[i].address, i % 2 === 0);
                }

                let accessList = [];
                for (let i = 0; i < 15; i++) {
                    accessList.push(signers[i].address);

                    await auction.NFTPotionAccessList.setAccessAll(accessList, i % 2 === 0);
                }
            });
            it("Add credit", async function () {
                for (let i = 0; i < 15; i++) {
                    for (let j = 0; j < raritiesConfig.length; j++) {
                        await auction.NFTPotionCredit.addCredit(signers[i].address, j, i * j * 3);
                    }
                }

                let buyersList = [];
                let itemsIdList = [];
                let amountsList = [];

                for (let i = 0; i < 15; i++) {
                    buyersList.push(signers[i].address);
                    itemsIdList.push(i % raritiesConfig.length);
                    amountsList.push(i * raritiesConfig.length * 3);

                    await auction.NFTPotionCredit.addCreditAll(buyersList, itemsIdList, amountsList);
                }
            });

            it("Transfer funds", async function () {
                await auction.NFTPotionFunds.transferFunds(signers[1].address);
            });
            it("Start/stop auction", async function () {
                for (let i = 0; i < raritiesConfig.length; i++) {
                    await auction.startAuction(i, i * 982);
                    await auction.stopAuction();
                }
            });
            it("Start + change price + stop auction", async function () {
                for (let i = 0; i < raritiesConfig.length; i++) {
                    await auction.startAuction(i, i * 982);

                    for (let j = 0; j < 10; j++) {
                        await auction.changePrice(i, j * 104);
                    }

                    await auction.stopAuction();
                }
            });
        });
        describe("Standard Cases", function () {
            it("Dutch auction, several price changes, purchases, no credit", async function () {
                const NUM_BUYERS = 10;
                const ITEMS_ID = 0;
                const NUM_TOKENS_PER_PURCHASE = 1;

                // Give access to buyers
                for (let i = 0; i < NUM_BUYERS; i++) {
                    await auction.NFTPotionAccessList.setAccess(signers[i].address, true);
                }

                // Auction starts
                await auction.startAuction(0, 100);

                let totalAvailable = raritiesConfig[ITEMS_ID].endTokenId - raritiesConfig[ITEMS_ID].startTokenId + 1;
                for (let i = 0; i < 20 && totalAvailable > 0; i++) {
                    const purchasePrice = await auction.purchasePrice();

                    for (let j = 0; j < NUM_BUYERS && totalAvailable > 0; j++) {
                        let amountToPurchase = Math.min(NUM_TOKENS_PER_PURCHASE, totalAvailable);

                        await auction.purchase(ITEMS_ID, amountToPurchase, purchasePrice, "SomeKey" + i);

                        totalAvailable -= amountToPurchase;
                    }

                    await auction.changePrice(0, 100 - i);
                }

                // Auction ends
                await auction.stopAuction();

                // Auction transfer funds
                await auction.NFTPotionFunds.transferFunds(signers[3].address);
            });
            it("Dutch auction, several price changes, purchases, with credit", async function () {
                const NUM_BUYERS = 10;
                const ITEMS_ID = 1;

                // Give access to buyers
                for (let i = 0; i < NUM_BUYERS; i++) {
                    await auction.NFTPotionAccessList.setAccess(signers[i].address, true);
                    await auction.NFTPotionCredit.addCredit(signers[i].address, ITEMS_ID, (i + 1) * 3);
                }

                // Auction starts
                await auction.startAuction(ITEMS_ID, 100);

                let totalAvailable = raritiesConfig[ITEMS_ID].endTokenId - raritiesConfig[ITEMS_ID].startTokenId + 1;
                for (let i = 0; i < 20 && totalAvailable > 0; i++) {
                    const purchasePrice = await auction.purchasePrice();

                    for (let j = 0; j < 10 && totalAvailable > 0; j++) {
                        let amountToPurchase = Math.min(i + 1 + (j + 1) * 2, totalAvailable);

                        await auction.purchase(ITEMS_ID, amountToPurchase, purchasePrice, "SomeKey" + i);

                        totalAvailable -= amountToPurchase;
                    }

                    await auction.changePrice(ITEMS_ID, 100 - i);
                }

                // Auction ends
                await auction.stopAuction();

                // Auction transfer funds
                await auction.NFTPotionFunds.transferFunds(owner.address);
            });
        });
        describe("Edge Cases", function () {
            it("Send more cash than needed", async function () {
                const NUM_BUYERS = 10;
                const ITEMS_ID = 0;
                const NUM_TOKENS_PER_PURCHASE = 1;

                // Give access to buyers
                for (let i = 0; i < NUM_BUYERS; i++) {
                    await auction.NFTPotionAccessList.setAccess(signers[i].address, true);
                }

                // Auction starts
                await auction.startAuction(ITEMS_ID, 100);

                let totalAvailable = raritiesConfig[ITEMS_ID].endTokenId - raritiesConfig[ITEMS_ID].startTokenId + 1;

                const purchasePrice = await auction.purchasePrice();

                for (let j = 0; j < NUM_BUYERS && totalAvailable > 0; j++) {
                    let amountToPurchase = Math.min(NUM_TOKENS_PER_PURCHASE, totalAvailable);

                    await auction.purchase(
                        ITEMS_ID,
                        amountToPurchase,
                        purchasePrice,
                        "SomeKey" + j,
                        amountToPurchase * purchasePrice + 20,
                    );

                    totalAvailable -= amountToPurchase;
                }

                // Auction ends
                await auction.stopAuction();

                // Auction transfer funds
                await auction.NFTPotionFunds.transferFunds(signers[3].address);
            });
            it("Purchase all NFTs except 1, then try to purchase 100", async function () {
                const NUM_BUYERS = 10;
                const ITEMS_ID = 1;
                const NUM_TOKENS_PER_PURCHASE = 600;

                // Give access to buyers
                for (let i = 0; i < NUM_BUYERS; i++) {
                    await auction.NFTPotionAccessList.setAccess(signers[i].address, true);
                }

                // Auction starts
                await auction.startAuction(ITEMS_ID, 100);

                let totalAvailable = raritiesConfig[ITEMS_ID].endTokenId - raritiesConfig[ITEMS_ID].startTokenId + 1;

                // Leave 1 token for the last purchase
                totalAvailable -= 1;

                const purchasePrice = await auction.purchasePrice();

                for (let j = 0; j < NUM_BUYERS && totalAvailable > 0; j++) {
                    let amountToPurchase = Math.min(NUM_TOKENS_PER_PURCHASE, totalAvailable);

                    await auction.purchase(ITEMS_ID, amountToPurchase, purchasePrice, "SomeKey" + j);

                    totalAvailable -= amountToPurchase;
                }

                const remainingItems = await auction.getRemainingItems(ITEMS_ID);
                expect(totalAvailable).to.be.equal(0);
                expect(remainingItems).to.be.equal(1);

                // Now purchase 100
                await auction.purchase(ITEMS_ID, 100, purchasePrice, "SomeKey");

                // Auction ends
                await auction.stopAuction();

                // Auction transfer funds
                await auction.NFTPotionFunds.transferFunds(signers[3].address);
            });
        });
    });
});

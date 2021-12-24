const { before } = require("mocha");
const { ethers } = require("hardhat");

const { deployUSDCContract, deployDutchAuctionContracts } = require("./testUtils");
const { getRaritiesConfig } = require("../scripts/lib/utils");

describe.skip("NFTPotionDutchAuction", function () {
    describe("Gas Estimations", function () {
        let auction;
        let signers;
        let raritiesConfig;
        let owner;
        let USDC;

        before(async function () {
            signers = await ethers.getSigners();
            raritiesConfig = getRaritiesConfig();
            owner = signers[0];

            USDC = await deployUSDCContract(signers, "100");
        });

        // Initialize the contract
        beforeEach(async function () {
            auction = await deployDutchAuctionContracts(USDC);
        });
        it("Single NFT purchased per call", async function () {
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
        it("Maximum amount of NFTs purchased in a single call", async function () {
            const NUM_BUYERS = 10;
            const ITEMS_ID = 0;
            const NUM_TOKENS_PER_PURCHASE = 600;

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
    });
});

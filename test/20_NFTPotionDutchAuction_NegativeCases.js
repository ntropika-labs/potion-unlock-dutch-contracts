const chai = require("chai");
const { before } = require("mocha");
const { ethers } = require("hardhat");
var chaiAsPromised = require("chai-as-promised");

const { NFTPotionV2Helper } = require("./NFTPotionV2Helper");
const { getRaritiesConfig } = require("../scripts/lib/utils");

const expect = chai.expect;
chai.use(chaiAsPromised);

describe("NFTPotionDutchAuction", function () {
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

        /**
         * Start auction
         */
        describe.only("Start Auction", function () {
            it("Only owner can start auction", async function () {
                try {
                    await auction.startAuction(1, 100, signers[1]);
                    await auction.startAuction(1, 100, signers[2]);
                    await auction.startAuction(1, 100, signers[3]);
                } catch (error) {
                    expect(error.message).to.equal("Ownable: caller is not the owner");
                }
            });
            it("Start auction for invalid rarity ID", async function () {
                const maxID = raritiesConfig.length - 1;

                try {
                    await auction.startAuction(maxID + 10, 100);
                    await auction.startAuction(maxID + 3, 100);
                    await auction.startAuction(maxID + 1, 100);
                } catch (error) {
                    expect(error.message).to.equal("Invalid rarity ID");
                }
            });
            it("Start auction when another auction is running", async function () {
                await auction.startAuction(0, 100);

                try {
                    await auction.startAuction(0, 100);
                    await auction.startAuction(1, 10);
                } catch (error) {
                    expect(error.message).to.equal("Auction is already active");
                }
            });
            it.only("Start auction all items have been sold", async function () {
                const PURCHASE_AT_ONCE = 100;

                await auction.startAuction(0, 100);

                let remainingItems = await auction.getRemainingItems(0);
                const purchasePrice = await auction.purchasePrice();

                await auction.NFTPotionAccessList.setAccess(owner.address, true);

                for (; remainingItems >= PURCHASE_AT_ONCE; remainingItems -= PURCHASE_AT_ONCE) {
                    await auction.purchase(0, PURCHASE_AT_ONCE, purchasePrice, "Some Public Key");
                }
                if (remainingItems > 0) {
                    await auction.purchase(0, remainingItems, purchasePrice, "Some Public Key");
                }

                remainingItems = await auction.getRemainingItems(0);
                expect(remainingItems).to.equal(0);

                await auction.stopAuction();

                try {
                    await auction.startAuction(0, 100);
                } catch (error) {
                    expect(error.message).to.equal("Items are already sold out");
                }
            });
        });
    });
});

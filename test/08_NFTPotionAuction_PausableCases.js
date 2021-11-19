const { expect } = require("chai");
const { ethers } = require("hardhat");

const { NFTPotionAuctionHelper } = require("./NFTPotionAuctionHelper");

describe("NFTPotionAuction", function () {
    describe("Pausable Cases", function () {
        let auction;

        // Initialize the contract
        beforeEach(async function () {
            auction = new NFTPotionAuctionHelper();
            await auction.initialize();
        });

        it("Non-owners cannot pause/unpause the contract", async function () {
            const signers = await ethers.getSigners();

            await expect(auction.contract.connect(signers[1]).pause()).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            await expect(auction.contract.connect(signers[1]).unpause()).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
        });
        it("While paused, non-owner functions cannot be called", async function () {
            const NUM_BIDDERS = 20;
            const START_TOKEN_ID = 1;
            const END_TOKEN_ID = 111;
            const MINIMUM_PRICE = 37;
            const PURCHASE_PRICE = 700;

            const signers = await ethers.getSigners();

            await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, 2000);

            for (let i = 0; i < NUM_BIDDERS; i++) {
                await auction.setBid((i % (END_TOKEN_ID - START_TOKEN_ID + 1)) + 1, MINIMUM_PRICE * 2, signers[i]);
            }

            await auction.contract.connect(signers[0]).pause();

            await expect(auction.contract.connect(signers[1]).setBid(5, MINIMUM_PRICE, 0)).to.be.revertedWith(
                "Pausable: paused",
            );
            await expect(auction.contract.connect(signers[1]).cancelBid(false)).to.be.revertedWith("Pausable: paused");
            await expect(auction.contract.connect(signers[1]).purchase(5)).to.be.revertedWith("Pausable: paused");
            await expect(auction.contract.connect(signers[1]).claim(1, true)).to.be.revertedWith("Pausable: paused");
            await expect(auction.contract.connect(signers[1]).claimRefund()).to.be.revertedWith("Pausable: paused");
            await expect(
                auction.contract.connect(signers[1]).endBatch(END_TOKEN_ID - START_TOKEN_ID + 1),
            ).to.be.revertedWith("Pausable: paused");

            await auction.contract.connect(signers[0]).unpause();

            await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);
        });
        it("While paused, owner functions can be called", async function () {
            const NUM_BIDDERS = 20;
            const START_TOKEN_ID = 1;
            const END_TOKEN_ID = 20;
            const MINIMUM_PRICE = 37;
            const PURCHASE_PRICE = 700;

            const bidders = [
                "0x0000000000000000000000000000000000000001",
                "0x0000000000000000000000000000000000000002",
                "0x0000000000000000000000000000000000000003",
                "0x0000000000000000000000000000000000000004",
                "0x0000000000000000000000000000000000000005",
                "0x0000000000000000000000000000000000000006",
                "0x0000000000000000000000000000000000000007",
            ];
            const numTokens = [5, 8, 10, 3, 4, 8, 9];
            const firstTokenIDs = [21, 26, 34, 44, 47, 51, 59];

            const signers = await ethers.getSigners();

            await auction.contract.connect(signers[0]).pause();
            await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, 2000);
            await auction.contract.connect(signers[0]).unpause();

            for (let i = 0; i < NUM_BIDDERS; i++) {
                await auction.setBid((i % (END_TOKEN_ID - START_TOKEN_ID + 1)) + 1, MINIMUM_PRICE * 2, signers[i]);
            }

            await auction.purchase(2, signers[1]);
            await auction.purchase(3, signers[2]);

            await auction.contract.connect(signers[0]).pause();
            await auction.transferFunds(signers[1]);
            await auction.contract.transferUnrequestedFunds(signers[1].address);
            await auction.contract.connect(signers[0]).unpause();

            await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);

            await auction.contract.connect(signers[0]).pause();
            await auction.whitelistBidders(bidders, numTokens, firstTokenIDs);
            await auction.contract.connect(signers[0]).unpause();
        });
    });
});

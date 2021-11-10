const { expect } = require("chai");
const { NFTPotionAuctionHelper } = require("./NFTPotionAuctionHelper");

describe("NFTPotionAuction", function () {
    describe("Auction Basic Cases", function () {
        let auction;

        // Initialize the contract
        beforeEach(async function () {
            auction = new NFTPotionAuctionHelper();
            await auction.initialize();
        });

        it("Bidder rebids several times", async function () {
            const START_TOKEN_ID = 1;
            const END_TOKEN_ID = 1120;
            const MINIMUM_PRICE = 8;
            const PURCHASE_PRICE = 1230;
            const AUCTION_DURATION = 2000;

            await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, AUCTION_DURATION);

            await auction.setBid(5, MINIMUM_PRICE);
            await auction.setBid(3, MINIMUM_PRICE + 10);
            await auction.setBid(10, MINIMUM_PRICE * 2);
            await auction.setBid(120, MINIMUM_PRICE * 10);
            await auction.setBid(1, MINIMUM_PRICE);
            await auction.setBid(END_TOKEN_ID - START_TOKEN_ID + 1, MINIMUM_PRICE + 1);

            await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);
        });

        it("Bidder bids and cancels repeated times, no refund", async function () {
            const START_TOKEN_ID = 1;
            const END_TOKEN_ID = 1120;
            const MINIMUM_PRICE = 8;
            const PURCHASE_PRICE = 1230;
            const AUCTION_DURATION = 2000;

            await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, AUCTION_DURATION);

            await auction.setBid(5, MINIMUM_PRICE);
            await auction.cancelBid(false);
            await auction.setBid(3, MINIMUM_PRICE + 10);
            await auction.cancelBid(false);
            await auction.setBid(10, MINIMUM_PRICE * 2);
            await auction.cancelBid(false);
            await auction.setBid(120, MINIMUM_PRICE * 10);
            await auction.cancelBid(false);

            await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);

            const batch = await auction.getPreviousBatch();

            expect(batch.numTokensSold).to.be.equal(0);
            expect(batch.numTokensClaimed).to.be.equal(0);
        });
        it("Bidder bids and cancels repeated times, with refund", async function () {
            const START_TOKEN_ID = 1;
            const END_TOKEN_ID = 100;
            const MINIMUM_PRICE = 23;
            const PURCHASE_PRICE = 1230;
            const AUCTION_DURATION = 2000;

            await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, AUCTION_DURATION);

            await auction.setBid(5, MINIMUM_PRICE);
            await auction.cancelBid(true);
            await auction.setBid(3, MINIMUM_PRICE + 10);
            await auction.cancelBid(true);
            await auction.setBid(10, MINIMUM_PRICE * 2);
            await auction.cancelBid(true);
            await auction.setBid(120, MINIMUM_PRICE * 10);

            await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);

            const batch = await auction.getPreviousBatch();

            expect(batch.numTokensSold).to.be.equal(100);
            expect(batch.numTokensClaimed).to.be.equal(0);
        });
        it("Bidder bids and cancels repeated times, sometimes with refund", async function () {
            const START_TOKEN_ID = 1;
            const END_TOKEN_ID = 100;
            const MINIMUM_PRICE = 23;
            const PURCHASE_PRICE = 1230;
            const AUCTION_DURATION = 2000;

            await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, AUCTION_DURATION);

            await auction.setBid(5, MINIMUM_PRICE);
            await auction.cancelBid(true);
            await auction.setBid(3, MINIMUM_PRICE + 10);
            await auction.cancelBid(false);
            await auction.setBid(10, MINIMUM_PRICE * 2);
            await auction.cancelBid(false);
            await auction.setBid(120, MINIMUM_PRICE * 10);
            await auction.cancelBid(true);
            await auction.setBid(120, MINIMUM_PRICE * 20);
            await auction.cancelBid(true);

            await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);

            const batch = await auction.getPreviousBatch();

            expect(batch.numTokensSold).to.be.equal(0);
            expect(batch.numTokensClaimed).to.be.equal(0);
        });

        it("Bidder purchase some tokens once", async function () {
            const START_TOKEN_ID = 1;
            const END_TOKEN_ID = 100;
            const MINIMUM_PRICE = 23;
            const PURCHASE_PRICE = 1230;
            const AUCTION_DURATION = 2000;

            await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, AUCTION_DURATION);

            await auction.purchase(30);

            await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);

            const batch = await auction.getPreviousBatch();

            expect(batch.numTokensSold).to.be.equal(30);
            expect(batch.numTokensClaimed).to.be.equal(30);
        });

        it("Bidder purchase some tokens several times", async function () {
            const START_TOKEN_ID = 1;
            const END_TOKEN_ID = 100;
            const MINIMUM_PRICE = 23;
            const PURCHASE_PRICE = 1230;
            const AUCTION_DURATION = 2000;

            await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, AUCTION_DURATION);

            await auction.purchase(30);
            await auction.purchase(10);
            await auction.purchase(5);

            await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);

            const batch = await auction.getPreviousBatch();

            expect(batch.numTokensSold).to.be.equal(45);
            expect(batch.numTokensClaimed).to.be.equal(45);
        });

        it("Bidder purchase all tokens at once", async function () {
            const START_TOKEN_ID = 1;
            const END_TOKEN_ID = 50;
            const MINIMUM_PRICE = 23;
            const PURCHASE_PRICE = 1230;
            const AUCTION_DURATION = 2000;

            await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, AUCTION_DURATION);

            await auction.purchase(50);

            await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);

            const batch = await auction.getPreviousBatch();

            expect(batch.numTokensSold).to.be.equal(50);
            expect(batch.numTokensClaimed).to.be.equal(50);
        });
        it("Bidder purchase all tokens in several purchases", async function () {
            const START_TOKEN_ID = 1;
            const END_TOKEN_ID = 198;
            const MINIMUM_PRICE = 23;
            const PURCHASE_PRICE = 1230;
            const AUCTION_DURATION = 2000;

            await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, AUCTION_DURATION);

            await auction.purchase(100);
            await auction.purchase(34);
            await auction.purchase(15);
            await auction.purchase(30);
            await auction.purchase(8);
            await auction.purchase(11);

            await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);

            const batch = await auction.getPreviousBatch();

            expect(batch.numTokensSold).to.be.equal(END_TOKEN_ID - START_TOKEN_ID + 1);
            expect(batch.numTokensClaimed).to.be.equal(END_TOKEN_ID - START_TOKEN_ID + 1);
        });
    });
});

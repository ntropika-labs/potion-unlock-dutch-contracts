const { NFTPotionAuctionHelper } = require("./NFTPotionAuctionHelper");

describe.skip("NFTPotionAuction", function () {
    describe("Auction Full Cycle", function () {
        let auction;

        // Initialize the contract
        beforeEach(async function () {
            auction = new NFTPotionAuctionHelper();
            await auction.initialize();
        });

        /**
         * Start batch
         */
        describe("Auction Basic Cases", function () {
            it("Bidder rebids several times", async function () {
                const START_TOKEN_ID = 1;
                const END_TOKEN_ID = 1120;
                const MINIMUM_PRICE = 8;
                const PURCHASE_PRICE = 1230;
                const AUCTION_DURATION = 2000;

                await auction.startBatch(START_TOKEN_ID, END_TOKEN_ID, MINIMUM_PRICE, PURCHASE_PRICE, AUCTION_DURATION);

                await auction.setBid(5, MINIMUM_PRICE);
                await auction.setBid(3, MINIMUM_PRICE + 10);
                //await auction.setBid(10, MINIMUM_PRICE * 2);
                //await auction.setBid(120, MINIMUM_PRICE * 10);

                //await auction.endBatch(END_TOKEN_ID - START_TOKEN_ID + 1);
            });
        });
    });
});

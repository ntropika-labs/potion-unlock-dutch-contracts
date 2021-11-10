const { expect } = require("chai");
const { ethers } = require("hardhat");
const { fastForwardChain, fromBN, fromBNStr, toBN, chainEpoch } = require("./NFTPotionAuctionUtils");

class NFTPotionAuctionHelper {
    contract;
    currentBatch;
    currentBatchId;
    bidsMap;
    bids;
    bidId;

    constructor() {
        this.currentBatchId = 1;
    }

    async initialize() {
        const NFTPotionAuction = await ethers.getContractFactory("NFTPotionAuction");
        this.contract = await NFTPotionAuction.deploy();
        await this.contract.deployed();
    }

    async startBatch(firstTokenId, lastTokenId, minimumPricePerToken, directPurchasePrice, auctionDuration) {
        this.bidsMap = new Map();
        this.bidId = toBN(2).pow(64).sub(1);
        this.numTokensSold = 0;

        const auctionEndDate = await chainEpoch(auctionDuration);

        await expect(
            this.contract.startBatch(
                firstTokenId,
                lastTokenId,
                minimumPricePerToken,
                directPurchasePrice,
                auctionEndDate,
            ),
        )
            .to.emit(this.contract, "BatchStarted")
            .withArgs(this.currentBatchId);

        this.currentBatch = await this.getBatch(this.currentBatchId);

        expect(this.currentBatch.startTokenId).to.equal(firstTokenId);
        expect(this.currentBatch.numTokensAuctioned).to.equal(lastTokenId - firstTokenId + 1);
        expect(this.currentBatch.minimumPricePerToken).to.equal(minimumPricePerToken);
        expect(this.currentBatch.auctionEndDate).to.equal(auctionEndDate);
        expect(this.currentBatch.clearingPrice).to.equal(0);
        expect(this.currentBatch.clearingBidId).to.equal("0");
        expect(this.currentBatch.lastBidderNumAssignedTokens).to.equal(0);
        expect(this.currentBatch.numTokensSold).to.equal(0);
        expect(this.currentBatch.numTokensClaimed).to.equal(0);
    }

    async endBatch(numBidsToProcess) {
        const epochNow = await chainEpoch();
        const fastForward = this.currentBatch.auctionEndDate - epochNow + 1;

        if (fastForward > 0) {
            await fastForwardChain(fastForward);
        }

        // Get the bids before they disappear
        const contractBids = await this._getAllBids();

        await expect(this.contract.endBatch(numBidsToProcess))
            .to.emit(this.contract, "BatchEnded")
            .withArgs(this.currentBatchId);

        this._processBids();
        this._validateBids(contractBids);

        this._calculateClearingPrice();
        await this._validateEndState();

        this.currentBatchId++;
    }

    async setBid(numTokens, pricePerToken, signer = undefined) {
        if (signer === undefined) {
            signer = (await ethers.getSigners())[0];
        }

        // Logic
        const oldBid = await this.contract.getLatestBid(this.currentBatchId, signer.address);
        const refund = await this.contract.refunds(signer.address);

        const credit = refund + oldBid.numTokens * oldBid.pricePerToken;
        const payable = credit <= numTokens * pricePerToken ? numTokens * pricePerToken - credit : 0;

        const prevBid = await this.contract.getPreviousBid(this.currentBatchId, numTokens, pricePerToken);
        //console.log(prevBid);
        //console.log(oldBid);

        await expect(this.contract.connect(signer).setBid(numTokens, pricePerToken, prevBid, { value: payable }))
            .to.emit(this.contract, "SetBid")
            .withArgs(this.currentBatchId, signer.address, numTokens, pricePerToken);

        // Checks
        const latestBid = await this.getLatestBid(signer.address);

        expect(latestBid.bidId).to.be.equal(fromBNStr(this.bidId));
        expect(latestBid.numTokens).to.be.equal(numTokens);
        expect(latestBid.pricePerToken).to.be.equal(pricePerToken);

        // Effects
        this.bidsMap.set(signer.address, {
            bidder: signer.address,
            bidId: fromBNStr(this.bidId),
            numTokens,
            pricePerToken,
        });

        this.bidId = this.bidId.sub(1);
    }

    async purchase(numTokens, signer = undefined) {
        if (signer === undefined) {
            signer = (await ethers.getSigners())[0];
        }

        await expect(
            this.contract
                .connect(signer)
                .purchase(numTokens, { value: numTokens * this.currentBatch.directPurchasePrice }),
        )
            .to.emit(this.contract, "Purchase")
            .withArgs(this.currentBatchId, signer.address, numTokens);

        this.currentBatch.numTokensSold += numTokens;
    }

    async getBatch(batchId) {
        let currentBatch = Object.assign({}, await this.contract.getBatch(batchId));

        currentBatch.startTokenId = fromBN(currentBatch.startTokenId);
        currentBatch.numTokensAuctioned = fromBN(currentBatch.numTokensAuctioned);
        currentBatch.minimumPricePerToken = fromBN(currentBatch.minimumPricePerToken);
        currentBatch.directPurchasePrice = fromBN(currentBatch.directPurchasePrice);
        currentBatch.auctionEndDate = fromBN(currentBatch.auctionEndDate);
        currentBatch.clearingPrice = fromBN(currentBatch.clearingPrice);
        currentBatch.clearingBidId = fromBNStr(currentBatch.clearingBidId);
        currentBatch.lastBidderNumAssignedTokens = fromBN(currentBatch.lastBidderNumAssignedTokens);
        currentBatch.numTokensSold = fromBN(currentBatch.numTokensSold);
        currentBatch.numTokensClaimed = fromBN(currentBatch.numTokensClaimed);

        return currentBatch;
    }

    async getLatestBid(bidder) {
        const latestBidBN = await this.contract.getLatestBid(this.currentBatchId, bidder);

        const latestBid = Object.assign({}, latestBidBN);

        latestBid.bidId = fromBNStr(latestBid.bidId);
        latestBid.numTokens = fromBN(latestBid.numTokens);
        latestBid.pricePerToken = fromBN(latestBid.pricePerToken);

        return latestBid;
    }

    _calculateClearingPrice() {
        if (this.currentBatch.numTokensSold >= this.currentBatch.numTokensAuctioned) {
            this.clearingPrice = 0;
        }

        for (const bid of this.bids) {
            if (this.currentBatch.numTokensSold + bid.numTokens >= this.currentBatch.numTokensAuctioned) {
                this.currentBatch.clearingPrice = bid.pricePerToken;
                this.currentBatch.clearingBidId = bid.bidId;

                this.currentBatch.lastBidderNumAssignedTokens =
                    this.currentBatch.numTokensAuctioned - this.currentBatch.numTokensSold;
                this.currentBatch.numTokensSold = this.currentBatch.numTokensAuctioned;
                return;
            }

            this.currentBatch.numTokensSold += bid.numTokens;
        }
    }

    _processBids() {
        this.bids = Array.from(this.bidsMap.values());
        this.bids.sort((a, b) => {
            if (a.pricePerToken !== b.pricePerToken) {
                return b.pricePerToken - a.pricePerToken;
            } else {
                return a.bidId - b.bidId;
            }
        });
    }

    async _getAllBids() {
        const allBidsBN = await this.contract.getAllBids();

        return allBidsBN.map(bid => {
            return {
                bidder: bid.bidder,
                bidId: fromBNStr(bid.bidId),
                numTokens: fromBN(bid.numTokens),
                pricePerToken: fromBN(bid.pricePerToken),
            };
        });
    }

    _validateBids(contractBids) {
        expect(contractBids.length).to.equal(this.bids.length);

        for (let i = 0; i < contractBids.length; i++) {
            expect(contractBids[i].bidder).to.equal(this.bids[i].bidder);
            expect(contractBids[i].bidId).to.equal(this.bids[i].bidId);
            expect(contractBids[i].numTokens).to.equal(this.bids[i].numTokens);
            expect(contractBids[i].pricePerToken).to.equal(this.bids[i].pricePerToken);
        }
    }

    async _validateEndState() {
        const contractState = await this.getBatch(this.currentBatchId);

        expect(this.currentBatch.startTokenId).to.equal(contractState.startTokenId);
        expect(this.currentBatch.numTokensAuctioned).to.equal(contractState.numTokensAuctioned);
        expect(this.currentBatch.minimumPricePerToken).to.equal(contractState.minimumPricePerToken);
        expect(this.currentBatch.auctionEndDate).to.equal(contractState.auctionEndDate);
        expect(this.currentBatch.clearingPrice).to.equal(contractState.clearingPrice);
        expect(this.currentBatch.clearingBidId).to.equal(contractState.clearingBidId);
        expect(this.currentBatch.lastBidderNumAssignedTokens).to.equal(contractState.lastBidderNumAssignedTokens);
        expect(this.currentBatch.numTokensSold).to.equal(contractState.numTokensSold);
    }
}

module.exports = { NFTPotionAuctionHelper };
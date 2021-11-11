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
        const oldBid = await this.getLatestBid(signer.address);
        const refund = await this.refunds(signer.address);

        const credit = refund + oldBid.numTokens * oldBid.pricePerToken;
        const payable = credit <= numTokens * pricePerToken ? numTokens * pricePerToken - credit : 0;
        const prevBid = await this.contract.getPreviousBid(this.currentBatchId, numTokens, pricePerToken);

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

    async cancelBid(alsoRefund, signer = undefined) {
        if (signer === undefined) {
            signer = (await ethers.getSigners())[0];
        }

        const canceledBid = await this.getLatestBid(signer.address);
        const refund = await this.refunds(signer.address);
        const balance = await signer.getBalance();

        // Logic
        const tx = await this.contract.connect(signer).cancelBid(alsoRefund);
        const receipt = await tx.wait();
        const gasCost = receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice);

        // Checks
        const latestBid = await this.getLatestBid(signer.address);

        expect(latestBid.bidId).to.be.equal("0");
        expect(latestBid.numTokens).to.be.equal(0);
        expect(latestBid.pricePerToken).to.be.equal(0);

        const currentBalance = await signer.getBalance();
        const currentRefund = await this.refunds(signer.address);
        if (alsoRefund) {
            expect(currentRefund).to.be.equal(0);
            expect(currentBalance).to.be.equal(
                balance
                    .sub(gasCost)
                    .add(refund)
                    .add(canceledBid.numTokens * canceledBid.pricePerToken),
            );
        } else {
            expect(currentRefund).to.be.equal(refund + canceledBid.numTokens * canceledBid.pricePerToken);
            expect(currentBalance).to.be.equal(balance.sub(gasCost));
        }

        // Effects
        this.bidsMap.delete(signer.address);
    }

    async purchase(numTokens, signer = undefined) {
        if (signer === undefined) {
            signer = (await ethers.getSigners())[0];
        }

        const credit = await this.refunds(signer.address);

        const payable =
            credit <= numTokens * this.currentBatch.directPurchasePrice
                ? numTokens * this.currentBatch.directPurchasePrice - credit
                : 0;

        const balance = await signer.getBalance();
        const whitelistRanges = await this.contract.getWhitelistRanges(signer.address);

        // Logic
        const tx = await this.contract.connect(signer).purchase(numTokens, { value: payable });

        await expect(tx).to.emit(this.contract, "Purchase").withArgs(this.currentBatchId, signer.address, numTokens);

        const receipt = await tx.wait();
        const gasCost = receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice);

        // Checks
        const currentBalance = await signer.getBalance();

        expect(currentBalance).to.be.equal(balance.sub(gasCost).sub(payable));

        const currentWhitelistRanges = await this.contract.getWhitelistRanges(signer.address);
        expect(currentWhitelistRanges.length).to.be.equal(whitelistRanges.length + 1);
        expect(currentWhitelistRanges[currentWhitelistRanges.length - 1].firstId).to.be.equal(
            this.currentBatch.startTokenId + this.currentBatch.numTokensSold,
        );
        expect(currentWhitelistRanges[currentWhitelistRanges.length - 1].lastId).to.be.equal(
            this.currentBatch.startTokenId + this.currentBatch.numTokensSold + numTokens - 1,
        );

        // Effects
        this.currentBatch.numTokensSold += numTokens;
        this.currentBatch.numTokensClaimed += numTokens;
    }
    async getPreviousBatch() {
        return this.getBatch(this.currentBatchId - 1);
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

    async refunds(bidder) {
        return fromBN(await this.contract.refunds(bidder));
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
        expect(this.currentBatch.numTokensClaimed).to.equal(contractState.numTokensClaimed);
    }
}

module.exports = { NFTPotionAuctionHelper };

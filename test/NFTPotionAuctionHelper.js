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
    whitelistMap;

    constructor() {
        this.currentBatchId = 1;
        this.claimableFunds = 0;
        this.numBidsToBeProcessed = 0;
        this.whitelistMap = new Map();
        this.bidId = toBN(2).pow(64).sub(1);
    }

    async initialize() {
        const NFTPotionAuction = await ethers.getContractFactory("NFTPotionAuction");
        this.contract = await NFTPotionAuction.deploy();
        await this.contract.deployed();
    }

    async startBatch(firstTokenId, lastTokenId, minimumPricePerToken, directPurchasePrice, auctionDuration) {
        this.bidsMap = new Map();
        this.numTokensSold = 0;
        this.numBidsAlreadyProcessed = 0;
        this.numBidsToBeProcessed = 0;

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

        this.currentBatch = await this.getCurrentBatch();

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
        // Logic
        const epochNow = await chainEpoch();
        const fastForward = this.currentBatch.auctionEndDate - epochNow + 1;

        if (fastForward > 0) {
            await fastForwardChain(fastForward);
        }

        if (this.numBidsAlreadyProcessed === 0) {
            // Effects
            this._processBids();
            this._calculateClearingPrice();
            this.contractBids = await this._getAllBids();
        }

        if (this.numBidsAlreadyProcessed + numBidsToProcess < this.numBidsToBeProcessed) {
            await expect(this.contract.endBatch(numBidsToProcess)).to.not.emit(this.contract, "BatchEnded");

            this.numBidsAlreadyProcessed += numBidsToProcess;
            return;
        }

        const nextTokenId = fromBN(await this.contract.nextFreeTokenId());

        await expect(this.contract.endBatch(numBidsToProcess))
            .to.emit(this.contract, "BatchEnded")
            .withArgs(this.currentBatchId);

        // Checks
        await this._validateEndState();
        this._validateBids(this.contractBids);

        const newNextTokenId = fromBN(await this.contract.nextFreeTokenId());
        expect(newNextTokenId).to.be.equal(nextTokenId + this.currentBatch.numTokensSold);

        // Effects
        this.currentBatchId++;
    }

    async setBid(numTokens, pricePerToken, signer = undefined, overridePrevBid = undefined) {
        if (signer === undefined) {
            signer = (await ethers.getSigners())[0];
        }

        // Logic
        const oldBid = await this.getLatestBid(this.currentBatchId, signer.address);
        const refund = await this.refunds(signer.address);

        const credit = refund + oldBid.numTokens * oldBid.pricePerToken;
        const payable = credit <= numTokens * pricePerToken ? numTokens * pricePerToken - credit : 0;

        let prevBid;
        if (overridePrevBid !== undefined) {
            prevBid = overridePrevBid;
        } else {
            prevBid = await this.contract.getPreviousBid(this.currentBatchId, numTokens, pricePerToken);
        }

        await expect(this.contract.connect(signer).setBid(numTokens, pricePerToken, prevBid, { value: payable }))
            .to.emit(this.contract, "SetBid")
            .withArgs(this.currentBatchId, signer.address, numTokens, pricePerToken);

        // Checks
        const latestBid = await this.getLatestBid(this.currentBatchId, signer.address);

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

        const canceledBid = await this.getLatestBid(this.currentBatchId, signer.address);
        const refund = await this.refunds(signer.address);
        const balance = await signer.getBalance();

        // Logic
        const tx = await this.contract.connect(signer).cancelBid(alsoRefund);
        const receipt = await tx.wait();
        const gasCost = receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice);

        // Checks
        const latestBid = await this.getLatestBid(this.currentBatchId, signer.address);

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
        this.claimableFunds += numTokens * this.currentBatch.directPurchasePrice;

        if (this.whitelistMap.has(signer.address)) {
            this.whitelistMap.get(signer.address).push({
                firstId: this.currentBatch.startTokenId + this.currentBatch.numTokensSold,
                lastId: this.currentBatch.startTokenId + this.currentBatch.numTokensSold + numTokens - 1,
            });
        } else {
            this.whitelistMap.set(signer.address, [
                {
                    firstId: this.currentBatch.startTokenId + this.currentBatch.numTokensSold,
                    lastId: this.currentBatch.startTokenId + this.currentBatch.numTokensSold + numTokens - 1,
                },
            ]);
        }
    }

    async getCurrentBatch() {
        let currentBatch = await this.contract.getCurrentBatch();
        return this._parseBatch(currentBatch);
    }

    async getPreviousBatch() {
        return this.getBatch(this.currentBatchId - 1);
    }

    async getBatch(batchId) {
        let batch = await this.contract.getBatch(batchId);
        return this._parseBatch(batch);
    }

    async getLatestBid(batchId, bidder) {
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

    async transferFunds(recipient, signer = undefined) {
        if (signer === undefined) {
            signer = (await ethers.getSigners())[0];
        }

        // Logic
        const balance = await recipient.getBalance();
        const funds = await this.contract.claimableFunds();

        const tx = await this.contract.connect(signer).transferFunds(recipient.address);
        const receipt = await tx.wait();
        const gasCost = receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice);

        // Checks
        const currentBalance = await recipient.getBalance();
        if (recipient.address === signer.address) {
            expect(currentBalance).to.be.equal(balance.sub(gasCost).add(funds));
        } else {
            expect(currentBalance).to.be.equal(balance.add(funds));
        }

        // Efects
        this.claimableFunds = 0;
    }

    async whitelistBidders(bidders, numTokens, tokenIds, signer = undefined) {
        if (signer === undefined) {
            signer = (await ethers.getSigners())[0];
        }

        // Logic
        await this.contract.connect(signer).whitelistBidders(bidders, numTokens, tokenIds);

        // Checks: TODO

        // Effects: TODO
    }

    async claim(batchId, alsoRefund, signer = undefined) {
        if (signer === undefined) {
            signer = (await ethers.getSigners())[0];
        }

        if (!this.bidsMap.has(signer.address)) {
            const bid = await this.getLatestBid(batchId, signer.address);

            expect(bid.bidId).to.be.equal("0");
            expect(bid.numTokens).to.be.equal(0);
            expect(bid.pricePerToken).to.be.equal(0);

            return;
        }

        // Logic
        const balance = await signer.getBalance();
        const refund = await this.refunds(signer.address);
        const whitelistRanges = await this.contract.getWhitelistRanges(signer.address);

        const tx = await this.contract.connect(signer).claim(batchId, alsoRefund);
        const receipt = await tx.wait();
        const gasCost = receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice);

        // Checks
        const currentBalance = await signer.getBalance();
        const currentRefund = await this.refunds(signer.address);
        const currentWhitelistRanges = await this.contract.getWhitelistRanges(signer.address);
        const newBatchState = await this.contract.getBatch(batchId);

        const bid = this.bidsMap.get(signer.address);

        let tokenRefund = bid.numTokens * bid.pricePerToken;
        let actualRefund = alsoRefund ? refund : 0;
        let numTokensToBeClaimed = 0;
        if (
            bid.pricePerToken > this.currentBatch.clearingPrice ||
            (bid.pricePerToken === this.currentBatch.clearingPrice && bid.bidId > this.currentBatch.clearingBidId)
        ) {
            tokenRefund = 0;
            numTokensToBeClaimed = bid.numTokens;
        } else if (
            bid.pricePerToken === this.currentBatch.clearingPrice &&
            bid.bidId === this.currentBatch.clearingBidId
        ) {
            tokenRefund = 0;
            numTokensToBeClaimed = this.currentBatch.lastBidderNumAssignedTokens;
        }

        expect(currentBalance).to.be.equal(balance.sub(gasCost).add(tokenRefund).add(actualRefund));
        expect(currentRefund).to.be.equal(refund - actualRefund);

        expect(newBatchState.numTokensClaimed).to.be.equal(this.currentBatch.numTokensClaimed + numTokensToBeClaimed);

        if (numTokensToBeClaimed > 0) {
            expect(currentWhitelistRanges.length).to.be.equal(whitelistRanges.length + 1);
            expect(currentWhitelistRanges[currentWhitelistRanges.length - 1].firstId).to.be.equal(
                this.currentBatch.startTokenId + this.currentBatch.numTokensClaimed,
            );
            expect(currentWhitelistRanges[currentWhitelistRanges.length - 1].lastId).to.be.equal(
                this.currentBatch.startTokenId + this.currentBatch.numTokensClaimed + numTokensToBeClaimed - 1,
            );
        } else {
            expect(currentWhitelistRanges.length).to.be.equal(whitelistRanges.length);
        }

        // Effects
        this.bidsMap.delete(signer.address);
        this.whitelistMap.set(signer.address, {
            firstId: this.currentBatch.startTokenId + this.currentBatch.numTokensClaimed,
            lastId: this.currentBatch.startTokenId + this.currentBatch.numTokensClaimed + numTokensToBeClaimed - 1,
        });
        this.currentBatch.numTokensClaimed += numTokensToBeClaimed;
    }

    async claimRefund(signer = undefined) {
        if (signer === undefined) {
            signer = (await ethers.getSigners())[0];
        }

        // Logic
        const balance = await signer.getBalance();
        const refunds = await this.refunds(signer.address);
        if (refunds === 0) {
            return;
        }

        const tx = await this.contract.connect(signer).claimRefund();
        const receipt = await tx.wait();
        const gasCost = receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice);

        // Checks
        const currentBalance = await signer.getBalance();
        expect(currentBalance).to.be.equal(balance.sub(gasCost).add(refunds));
    }

    getNumBidsToProcessForEndBatch() {
        this._processBids();

        let numBidsToProcess = 1;
        let numTokensSold = this.currentBatch.numTokensSold;
        let numTokensAuctioned = this.currentBatch.numTokensAuctioned;

        for (const bid of this.bids) {
            if (numTokensSold + bid.numTokens >= numTokensAuctioned) {
                break;
            }

            numBidsToProcess++;
            numTokensSold += bid.numTokens;
        }

        return numBidsToProcess;
    }

    _parseBatch(batch) {
        let parsedBatch = Object.assign({}, batch);

        parsedBatch.startTokenId = fromBN(parsedBatch.startTokenId);
        parsedBatch.numTokensAuctioned = fromBN(parsedBatch.numTokensAuctioned);
        parsedBatch.minimumPricePerToken = fromBN(parsedBatch.minimumPricePerToken);
        parsedBatch.directPurchasePrice = fromBN(parsedBatch.directPurchasePrice);
        parsedBatch.auctionEndDate = fromBN(parsedBatch.auctionEndDate);
        parsedBatch.clearingPrice = fromBN(parsedBatch.clearingPrice);
        parsedBatch.clearingBidId = fromBNStr(parsedBatch.clearingBidId);
        parsedBatch.lastBidderNumAssignedTokens = fromBN(parsedBatch.lastBidderNumAssignedTokens);
        parsedBatch.numTokensSold = fromBN(parsedBatch.numTokensSold);
        parsedBatch.numTokensClaimed = fromBN(parsedBatch.numTokensClaimed);

        return parsedBatch;
    }

    _calculateClearingPrice() {
        if (this.currentBatch.numTokensSold >= this.currentBatch.numTokensAuctioned) {
            this.clearingPrice = 0;
            this.numBidsToBeProcessed = 0;
            return;
        }

        for (const bid of this.bids) {
            this.numBidsToBeProcessed++;

            if (this.currentBatch.numTokensSold + bid.numTokens >= this.currentBatch.numTokensAuctioned) {
                this.currentBatch.clearingPrice = bid.pricePerToken;
                this.currentBatch.clearingBidId = bid.bidId;

                this.currentBatch.lastBidderNumAssignedTokens =
                    this.currentBatch.numTokensAuctioned - this.currentBatch.numTokensSold;
                this.currentBatch.numTokensSold = this.currentBatch.numTokensAuctioned;

                this.claimableFunds += this.currentBatch.lastBidderNumAssignedTokens * bid.pricePerToken;

                return;
            }

            this.claimableFunds += bid.numTokens * bid.pricePerToken;
            this.currentBatch.numTokensSold += bid.numTokens;
        }
    }

    _processBids() {
        this.bids = Array.from(this.bidsMap.values());
        this.bids.sort((a, b) => {
            if (a.pricePerToken !== b.pricePerToken) {
                return b.pricePerToken - a.pricePerToken;
            } else {
                return b.bidId.localeCompare(a.bidId);
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

        const claimableFunds = await this.contract.claimableFunds();

        expect(this.claimableFunds).to.equal(fromBN(claimableFunds));
    }
}

module.exports = { NFTPotionAuctionHelper };

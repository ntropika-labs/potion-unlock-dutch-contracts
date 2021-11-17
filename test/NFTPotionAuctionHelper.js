const { expect } = require("chai");
const { ethers } = require("hardhat");
const { fastForwardChain, fromBN, fromBNStr, toBN, chainEpoch } = require("./NFTPotionAuctionUtils");

class NFTPotionAuctionHelper {
    contract;

    // Globals
    currentBatchId;
    currentBidId;
    whitelistMap;

    // Batch
    batchMap;

    // Validation
    sortedBids;

    // Contract State
    currentBatch;

    constructor() {
        this.currentBatchId = 1;
        this.claimableFunds = 0;
        this.numBidsToBeProcessed = 0;
        this.whitelistMap = new Map();
        this.currentBidId = toBN(2).pow(64).sub(1);
        this.batchMap = new Map();
    }

    async initialize() {
        const NFTPotionAuction = await ethers.getContractFactory("NFTPotionAuction");
        this.contract = await NFTPotionAuction.deploy();
        await this.contract.deployed();
    }

    async startBatch(firstTokenId, lastTokenId, minimumPricePerToken, directPurchasePrice, auctionDuration) {
        this.batchMap.set(this.currentBatchId, new Map());
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

        expect(latestBid.bidId).to.be.equal(fromBNStr(this.currentBidId));
        expect(latestBid.numTokens).to.be.equal(numTokens);
        expect(latestBid.pricePerToken).to.be.equal(pricePerToken);

        // Effects
        const bidsMap = this.batchMap.get(this.currentBatchId);
        bidsMap.set(signer.address, {
            bidder: signer.address,
            bidId: fromBNStr(this.currentBidId),
            numTokens,
            pricePerToken,
        });

        this.currentBidId = this.currentBidId.sub(1);
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
        const bidsMap = this.batchMap.get(this.currentBatchId);
        bidsMap.delete(signer.address);
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

        this._addToWhitelist(
            signer.address,
            this.currentBatch.startTokenId + this.currentBatch.numTokensSold,
            this.currentBatch.startTokenId + this.currentBatch.numTokensSold + numTokens - 1,
        );
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

        // Checks
        for (let i = 0; i < bidders.length; i++) {
            const currentWhitelistRanges = await this.contract.getWhitelistRanges(bidders[i]);
            let previousWhitelistRanges = await this.whitelistMap.get(bidders[i]);

            if (previousWhitelistRanges === undefined) {
                previousWhitelistRanges = [];
            }

            expect(currentWhitelistRanges.length).to.be.equal(previousWhitelistRanges.length + 1);

            expect(currentWhitelistRanges[currentWhitelistRanges.length - 1].firstId).to.be.equal(tokenIds[i]);
            expect(currentWhitelistRanges[currentWhitelistRanges.length - 1].lastId).to.be.equal(
                tokenIds[i] + numTokens[i] - 1,
            );
        }

        // Effects
        for (let i = 0; i < bidders.length; i++) {
            this._addToWhitelist(bidders[i], tokenIds[i], tokenIds[i] + numTokens[i] - 1);
        }
    }

    async claim(batchId, alsoRefund, signer = undefined) {
        if (signer === undefined) {
            signer = (await ethers.getSigners())[0];
        }

        const bidsMap = this.batchMap.get(batchId);
        if (!bidsMap.has(signer.address)) {
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
        const batchState = await this.getBatch(batchId);

        const tx = await this.contract.connect(signer).claim(batchId, alsoRefund);
        const receipt = await tx.wait();
        const gasCost = receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice);

        // Checks
        const currentBalance = await signer.getBalance();
        const currentRefund = await this.refunds(signer.address);
        const currentWhitelistRanges = await this.contract.getWhitelistRanges(signer.address);
        const newBatchState = await this.getBatch(batchId);

        const bid = bidsMap.get(signer.address);

        let tokenCost = 0;
        let numTokensToBeClaimed = 0;
        if (
            bid.pricePerToken > batchState.clearingPrice ||
            (bid.pricePerToken === batchState.clearingPrice && bid.bidId > batchState.clearingBidId)
        ) {
            tokenCost = bid.numTokens * bid.pricePerToken;
            numTokensToBeClaimed = bid.numTokens;
        } else if (bid.pricePerToken === batchState.clearingPrice && bid.bidId === batchState.clearingBidId) {
            tokenCost = batchState.lastBidderNumAssignedTokens * bid.pricePerToken;
            numTokensToBeClaimed = batchState.lastBidderNumAssignedTokens;
        }

        let tokenRefund = bid.numTokens * bid.pricePerToken - tokenCost;
        let actualRefund = alsoRefund ? refund + tokenRefund : 0;

        expect(currentBalance).to.be.equal(balance.sub(gasCost).add(actualRefund));
        expect(currentRefund).to.be.equal(refund + tokenRefund - actualRefund);

        expect(newBatchState.numTokensClaimed).to.be.equal(batchState.numTokensClaimed + numTokensToBeClaimed);

        if (numTokensToBeClaimed > 0) {
            expect(currentWhitelistRanges.length).to.be.equal(whitelistRanges.length + 1);
            expect(currentWhitelistRanges[currentWhitelistRanges.length - 1].firstId).to.be.equal(
                batchState.startTokenId + batchState.numTokensClaimed,
            );
            expect(currentWhitelistRanges[currentWhitelistRanges.length - 1].lastId).to.be.equal(
                batchState.startTokenId + batchState.numTokensClaimed + numTokensToBeClaimed - 1,
            );
        } else {
            expect(currentWhitelistRanges.length).to.be.equal(whitelistRanges.length);
        }

        // Effects
        bidsMap.delete(signer.address);
        if (numTokensToBeClaimed > 0) {
            this._addToWhitelist(
                signer.address,
                batchState.startTokenId + batchState.numTokensClaimed,
                batchState.startTokenId + batchState.numTokensClaimed + numTokensToBeClaimed - 1,
            );
        }
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

        for (const bid of this.sortedBids) {
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

        for (const bid of this.sortedBids) {
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
        const bidsMap = this.batchMap.get(this.currentBatchId);
        this.sortedBids = Array.from(bidsMap.values());
        this.sortedBids.sort((a, b) => {
            if (a.pricePerToken !== b.pricePerToken) {
                return b.pricePerToken - a.pricePerToken;
            } else {
                return b.bidId.localeCompare(a.bidId);
            }
        });
    }

    async _getAllBids() {
        const allBidsBN = await this.contract.getAllBids(0);

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
        expect(contractBids.length).to.equal(this.sortedBids.length);

        for (let i = 0; i < contractBids.length; i++) {
            expect(contractBids[i].bidder).to.equal(this.sortedBids[i].bidder);
            expect(contractBids[i].bidId).to.equal(this.sortedBids[i].bidId);
            expect(contractBids[i].numTokens).to.equal(this.sortedBids[i].numTokens);
            expect(contractBids[i].pricePerToken).to.equal(this.sortedBids[i].pricePerToken);
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

    _addToWhitelist(bidder, firstId, lastId) {
        if (this.whitelistMap.has(bidder)) {
            this.whitelistMap.get(bidder).push({
                firstId,
                lastId,
            });
        } else {
            this.whitelistMap.set(bidder, [
                {
                    firstId,
                    lastId,
                },
            ]);
        }
    }
}

module.exports = { NFTPotionAuctionHelper };

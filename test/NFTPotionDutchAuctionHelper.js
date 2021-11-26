const { expect } = require("chai");
const { ethers } = require("hardhat");
const { fromBN } = require("./NFTPotionAuctionUtils");

const { NFTPotionFundsHelper } = require("./NFTPotionFundsHelper");
const { NFTPotionAccessListHelper } = require("./NFTPotionAccessListHelper");
const { NFTPotionCreditHelper } = require("./NFTPotionCreditHelper");

class NFTPotionDutchAuctionHelper {
    parent;
    contract;
    owner;

    NFTPotionFunds;
    NFTPotionAccessList;
    NFTPotionCredit;

    itemsId;
    purchasePrice;
    isAuctionActive;

    async initialize(parent) {
        this.parent = parent;
        this.contract = parent.contract;
        this.owner = await ethers.getSigners()[0];

        this.NFTPotionFunds = new NFTPotionFundsHelper(this);
        this.NFTPotionAccessList = new NFTPotionAccessListHelper(this);
        this.NFTPotionCredit = new NFTPotionCreditHelper(this);

        this.itemsId = 0;
        this.purchasePrice = 0;
        this.isAuctionActive = false;
    }

    async startAuction(itemsId, purchasePrice, signer = undefined) {
        if (signer === undefined) {
            signer = this.owner;
        } else if (signer !== this.owner) {
            await expect(this.contract.connect(signer).startAuction(itemsId, purchasePrice)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            return;
        }

        if (this.isAuctionActive) {
            await expect(this.contract.connect(signer).startAuction(itemsId, purchasePrice)).to.be.revertedWith(
                "Auction is already active",
            );
            return;
        }

        if (this.parent._getRemainingItems(itemsId) <= 0) {
            await expect(this.contract.connect(signer).startAuction(itemsId, purchasePrice)).to.be.revertedWith(
                "Items are already sold out",
            );
            return;
        }

        if (!this.parent._isValidId(itemsId)) {
            await expect(this.contract.connect(signer).startAuction(itemsId, purchasePrice)).to.be.revertedWith(
                "Invalid rarity ID",
            );
            return;
        }

        // Logic
        await this.contract.connect(signer).startAuction(itemsId, purchasePrice);

        // Checks and effects
        this.itemsId = await this.contract.itemsId();
        this.purchasePrice = await this.contract.purchasePrice();
        this.isAuctionActive = await this.contract.isAuctionActive();

        expect(this.itemsId).to.be.equal(itemsId);
        expect(this.purchasePrice).to.be.equal(purchasePrice);
        expect(this.isAuctionActive).to.be.equal(true);
    }

    async stopAuction(itemsId, purchasePrice, signer = undefined) {
        if (signer === undefined) {
            signer = this.owner;
        } else if (signer !== this.owner) {
            await expect(this.contract.connect(signer).stopAuction(itemsId, purchasePrice)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            return;
        }

        // Logic
        await this.contract.connect(signer).stopAuction();

        // Checks and effects
        this.isAuctionActive = await this.contract.isAuctionActive();

        expect(this.isAuctionActive).to.be.equal(false);
    }

    async changePrice(newPrice, signer = undefined) {
        if (signer === undefined) {
            signer = this.owner;
        } else if (signer !== this.owner) {
            await expect(this.contract.connect(signer).changePrice(newPrice)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            return;
        }

        if (!this.isAuctionActive) {
            await expect(this.contract.connect(signer).changePrice(newPrice)).to.be.revertedWith(
                "Auction is not active",
            );
            return;
        }

        // Logic
        await this.contract.connect(signer).changePrice(newPrice);

        // Checks and effects
        this.purchasePrice = await this.contract.purchasePrice();

        expect(this.purchasePrice).to.be.equal(newPrice);
    }

    async purchase(amount, publicKey, sendValue, signer = undefined) {
        if (signer === undefined) {
            signer = this.owner;
        }

        if (!this.isAuctionActive) {
            await expect(this.contract.connect(signer).purchase(amount, publicKey)).to.be.revertedWith(
                "Auction is not active",
            );
            return;
        }

        const remainingItemsBefore = await this.parent._getRemainingItems(this.itemsId);
        if (remainingItemsBefore <= 0) {
            await expect(this.contract.connect(signer).purchase(amount, publicKey)).to.be.revertedWith(
                "Auction is sold out",
            );
            return;
        }

        const callerHasAccess = await this.NFTPotionAccessList.canAccess(signer.address);
        if (!callerHasAccess) {
            await expect(this.contract.connect(signer).purchase(amount, publicKey)).to.be.revertedWith(
                "AccessList: Caller doesn't have access",
            );
            return;
        }

        const currentCreditBefore = fromBN(await this.NFTPotionCredit.getCredit(signer.address, this.itemsId));
        const amountToPurchase = amount > remainingItemsBefore ? remainingItemsBefore : amount;
        const amountToPay = amountToPurchase > currentCreditBefore ? amountToPurchase - currentCreditBefore : 0;
        const toPay = amountToPay * this.purchasePrice;

        if (sendValue < toPay) {
            await expect(this.contract.connect(signer).purchase(amount, publicKey)).to.be.revertedWith(
                "Didn't send enough cash for payment",
            );
            return;
        }

        // Logic
        await this.contract.connect(signer).purchase(amount, publicKey);

        await this.parent._purchaseItems(this.itemsId, amountToPurchase, publicKey);

        // Checks and effects
        const remainingItemsAfter = await this.parent._getRemainingItems(this.itemsId);

        expect(remainingItemsAfter).to.be.equal(remainingItemsBefore - amountToPurchase);

        return amountToPurchase;
    }
}

module.exports = { NFTPotionDutchAuctionHelper };

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

    currentId;
    purchasePrice;
    isAuctionActive;

    async initialize(parent) {
        this.parent = parent;
        this.contract = parent.contract;
        this.owner = await ethers.getSigners()[0];

        this.NFTPotionFunds = new NFTPotionFundsHelper(this);
        this.NFTPotionAccessList = new NFTPotionAccessListHelper(this);
        this.NFTPotionCredit = new NFTPotionCreditHelper(this);

        this.currentId = 0;
        this.purchasePrice = 0;
        this.isAuctionActive = false;
    }

    async startAuction(id, purchasePrice, signer = undefined) {
        if (signer === undefined) {
            signer = this.owner;
        } else if (signer !== this.owner) {
            await expect(this.contract.connect(signer).startAuction(id, purchasePrice)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            return;
        }

        if (this.isAuctionActive) {
            await expect(this.contract.connect(signer).startAuction(id, purchasePrice)).to.be.revertedWith(
                "Auction is already active",
            );
            return;
        }

        if (this.parent._getRemainingItems(id) <= 0) {
            await expect(this.contract.connect(signer).startAuction(id, purchasePrice)).to.be.revertedWith(
                "Items are already sold out",
            );
            return;
        }

        if (!this.parent._isValidId(id)) {
            await expect(this.contract.connect(signer).startAuction(id, purchasePrice)).to.be.revertedWith(
                "Invalid rarity ID",
            );
            return;
        }

        // Logic
        await this.contract.connect(signer).startAuction(id, purchasePrice);

        // Checks and effects
        this.currentId = await this.contract.currentId();
        this.purchasePrice = await this.contract.purchasePrice();
        this.isAuctionActive = await this.contract.isAuctionActive();

        expect(this.currentId).to.be.equal(id);
        expect(this.purchasePrice).to.be.equal(purchasePrice);
        expect(this.isAuctionActive).to.be.equal(true);
    }

    async stopAuction(signer = undefined) {
        if (signer === undefined) {
            signer = this.owner;
        } else if (signer !== this.owner) {
            await expect(this.contract.connect(signer).stopAuction()).to.be.revertedWith(
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

    async changePrice(id, newPrice, signer = undefined) {
        if (signer === undefined) {
            signer = this.owner;
        } else if (signer !== this.owner) {
            await expect(this.contract.connect(signer).changePrice(id, newPrice)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            return;
        }

        if (!this.isAuctionActive) {
            await expect(this.contract.connect(signer).changePrice(id, newPrice)).to.be.revertedWith(
                "Auction is not active",
            );
            return;
        }

        if (id !== this.currentId) {
            await expect(this.contract.connect(signer).changePrice(id, newPrice)).to.be.revertedWith(
                "Active auction ID mismatch",
            );
            return;
        }

        // Logic
        await this.contract.connect(signer).changePrice(newPrice);

        // Checks and effects
        this.purchasePrice = await this.contract.purchasePrice();

        expect(this.purchasePrice).to.be.equal(newPrice);
    }

    async purchase(id, amount, limitPrice, publicKey, sendValue, signer = undefined) {
        if (signer === undefined) {
            signer = this.owner;
        }

        if (!this.isAuctionActive) {
            await expect(this.contract.connect(signer).purchase(id, amount, limitPrice, publicKey)).to.be.revertedWith(
                "Auction is not active",
            );
            return;
        }

        const remainingItemsBefore = await this.parent._getRemainingItems(this.currentId);
        if (remainingItemsBefore <= 0) {
            await expect(this.contract.connect(signer).purchase(id, amount, limitPrice, publicKey)).to.be.revertedWith(
                "Auction is sold out",
            );
            return;
        }

        const callerHasAccess = await this.NFTPotionAccessList.canAccess(signer.address);
        if (!callerHasAccess) {
            await expect(this.contract.connect(signer).purchase(id, amount, limitPrice, publicKey)).to.be.revertedWith(
                "AccessList: Caller doesn't have access",
            );
            return;
        }

        if (id !== this.currentId) {
            await expect(this.contract.connect(signer).purchase(id, amount, limitPrice, publicKey)).to.be.revertedWith(
                "Active auction ID mismatch",
            );
            return;
        }

        const currentCreditBefore = fromBN(await this.NFTPotionCredit.getCredit(signer.address, this.currentId));
        const amountToPurchase = amount > remainingItemsBefore ? remainingItemsBefore : amount;
        const amountToPay = amountToPurchase > currentCreditBefore ? amountToPurchase - currentCreditBefore : 0;
        const toPay = amountToPay * this.purchasePrice;

        if (sendValue < toPay) {
            await expect(this.contract.connect(signer).purchase(id, amount, limitPrice, publicKey)).to.be.revertedWith(
                "Didn't send enough cash for payment",
            );
            return;
        }

        // Logic
        await this.contract.connect(signer).purchase(id, amount, limitPrice, publicKey);

        await this.parent._purchaseItems(this.currentId, amountToPurchase, publicKey);

        // Checks and effects
        const remainingItemsAfter = await this.parent._getRemainingItems(this.currentId);

        expect(remainingItemsAfter).to.be.equal(remainingItemsBefore - amountToPurchase);

        return amountToPurchase;
    }
}

module.exports = { NFTPotionDutchAuctionHelper };

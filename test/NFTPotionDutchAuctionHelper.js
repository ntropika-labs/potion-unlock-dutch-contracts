const { expect } = require("chai");
const { ethers } = require("hardhat");
const { fromBN } = require("./NFTPotionAuctionUtils");

const { NFTPotionFundsHelper } = require("./NFTPotionFundsHelper");
const { NFTPotionAccessListHelper } = require("./NFTPotionAccessListHelper");
const { NFTPotionCreditHelper } = require("./NFTPotionCreditHelper");
const { send } = require("process");

class NFTPotionDutchAuctionHelper {
    parent;
    contract;
    owner;

    currentId;
    purchasePrice;
    isAuctionActive;

    constructor(parent) {
        this.parent = parent;
        this.contract = parent.contract;

        this.currentId = 0;
        this.purchasePrice = 0;
        this.isAuctionActive = false;
    }

    async initialize() {
        this.owner = (await ethers.getSigners())[0];
    }

    async startAuction(id, purchasePrice, signer = undefined) {
        if (signer === undefined) {
            signer = this.owner;
        } else if (signer !== this.owner) {
            await expect(this.contract.connect(signer).startAuction(id, purchasePrice)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            throw new Error("Ownable: caller is not the owner");
        }

        if (this.isAuctionActive) {
            await expect(this.contract.connect(signer).startAuction(id, purchasePrice)).to.be.revertedWith(
                "Auction is already active",
            );
            throw new Error("Auction is already active");
        }

        if (!this.parent._isValidId(id)) {
            await expect(this.contract.connect(signer).startAuction(id, purchasePrice)).to.be.revertedWith(
                "Invalid rarity ID",
            );
            throw new Error("Invalid rarity ID");
        }

        if ((await this.parent.getRemainingItems(id)) <= 0) {
            await expect(this.contract.connect(signer).startAuction(id, purchasePrice)).to.be.revertedWith(
                "Items are already sold out",
            );
            throw new Error("Items are already sold out");
        }

        // Logic
        await this.contract.connect(signer).startAuction(id, purchasePrice);

        // Checks and effects
        this.currentId = fromBN(await this.contract.currentId());
        this.purchasePrice = fromBN(await this.contract.purchasePrice());
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
            throw new Error("Ownable: caller is not the owner");
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
            throw new Error("Ownable: caller is not the owner");
        }

        if (!this.isAuctionActive) {
            await expect(this.contract.connect(signer).changePrice(id, newPrice)).to.be.revertedWith(
                "Auction is not active",
            );
            throw new Error("Auction is not active");
        }

        if (id !== this.currentId) {
            await expect(this.contract.connect(signer).changePrice(id, newPrice)).to.be.revertedWith(
                "Active auction ID mismatch",
            );
            throw new Error("Active auction ID mismatch");
        }
        if (newPrice === 0) {
            await expect(this.contract.connect(signer).changePrice(id, newPrice)).to.be.revertedWith(
                "New price must be greater than 0",
            );
            throw new Error("New price must be greater than 0");
        }

        // Logic
        await this.contract.connect(signer).changePrice(id, newPrice);

        // Checks and effects
        this.purchasePrice = await this.contract.purchasePrice();

        expect(this.purchasePrice).to.be.equal(newPrice);
    }

    async purchase(id, amount, limitPrice, publicKey, sendValue = undefined, signer = undefined) {
        if (signer === undefined) {
            signer = this.owner;
        }

        if (!this.isAuctionActive) {
            await expect(this.contract.connect(signer).purchase(id, amount, limitPrice, publicKey)).to.be.revertedWith(
                "Auction is not active",
            );
            throw new Error("Auction is not active");
        }

        if (id !== this.currentId) {
            await expect(this.contract.connect(signer).purchase(id, amount, limitPrice, publicKey)).to.be.revertedWith(
                "Active auction ID mismatch",
            );
            throw new Error("Active auction ID mismatch");
        }

        const callerHasAccess = await this.parent.NFTPotionAccessList.canAccess(signer.address);
        if (!callerHasAccess) {
            await expect(this.contract.connect(signer).purchase(id, amount, limitPrice, publicKey)).to.be.revertedWith(
                "AccessList: Caller doesn't have access",
            );
            throw new Error("AccessList: Caller doesn't have access");
        }
        const remainingItemsBefore = await this.parent.getRemainingItems(this.currentId);
        if (remainingItemsBefore <= 0) {
            await expect(this.contract.connect(signer).purchase(id, amount, limitPrice, publicKey)).to.be.revertedWith(
                "Items are already sold out",
            );
            throw new Error("Items are already sold out");
        }

        if (limitPrice < this.purchasePrice) {
            await expect(this.contract.connect(signer).purchase(id, amount, limitPrice, publicKey)).to.be.revertedWith(
                "Current price is higher than limit price",
            );
            throw new Error("Current price is higher than limit price");
        }

        const currentCreditBefore = fromBN(await this.parent.NFTPotionCredit.getCredit(signer.address, this.currentId));
        const amountToPurchase = amount > remainingItemsBefore ? remainingItemsBefore : amount;
        const amountToPay = amountToPurchase > currentCreditBefore ? amountToPurchase - currentCreditBefore : 0;
        const toPay = amountToPay * this.purchasePrice;

        if (sendValue === undefined) {
            sendValue = toPay;
        }

        if (sendValue < toPay) {
            await expect(this.contract.connect(signer).purchase(id, amount, limitPrice, publicKey)).to.be.revertedWith(
                "Didn't send enough cash for payment",
            );
            throw new Error("Didn't send enough cash for payment");
        }

        // Logic
        await this.contract.connect(signer).purchase(id, amount, limitPrice, publicKey, { value: sendValue });

        // Checks and effects
        const remainingItemsAfter = await this.contract.getRemainingItems(this.currentId);

        expect(remainingItemsAfter).to.be.equal(remainingItemsBefore - amountToPurchase);

        return amountToPurchase;
    }
}

module.exports = { NFTPotionDutchAuctionHelper };

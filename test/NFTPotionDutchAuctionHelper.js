const { expect } = require("chai");
const { ethers } = require("hardhat");
const { fromBN, toBN } = require("./NFTPotionAuctionUtils");

class NFTPotionDutchAuctionHelper {
    STATE_INACTIVE = 0;
    STATE_ACTIVE = 1;

    parent;
    contract;
    owner;

    currentId;
    purchasePrice;
    auctionState;

    constructor(parent) {
        this.parent = parent;
        this.contract = parent.contract;
        this.USDC = parent.USDC;

        this.currentId = 0;
        this.purchasePrice = 0;
        this.auctionState = this.STATE_INACTIVE;
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

        if (this.auctionState === this.STATE_ACTIVE) {
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

        if ((await this.parent.getRemainingNFTs(id)) <= 0) {
            await expect(this.contract.connect(signer).startAuction(id, purchasePrice)).to.be.revertedWith(
                "Rarity is already sold out",
            );
            throw new Error("Rarity is already sold out");
        }

        // Logic
        await expect(this.contract.connect(signer).startAuction(id, purchasePrice))
            .to.emit(this.contract, "AuctionStarted")
            .withArgs(id, purchasePrice);

        // Checks and effects
        this.currentId = fromBN(await this.contract.currentRarityId());
        this.purchasePrice = fromBN(await this.contract.purchasePrice());
        this.auctionState = await this.contract.auctionState();

        expect(this.currentId).to.be.equal(id);
        expect(this.purchasePrice).to.be.equal(purchasePrice);
        expect(this.auctionState).to.be.equal(this.STATE_ACTIVE);
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
        await expect(this.contract.connect(signer).stopAuction())
            .to.emit(this.contract, "AuctionStopped")
            .withArgs(this.currentId);

        // Checks and effects
        this.auctionState = await this.contract.auctionState();

        expect(this.auctionState).to.be.equal(this.STATE_INACTIVE);
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

        if (this.auctionState === this.STATE_INACTIVE) {
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

        // Logic
        await expect(this.contract.connect(signer).changePrice(id, newPrice))
            .to.emit(this.contract, "AuctionPriceChanged")
            .withArgs(id, newPrice);

        // Checks and effects
        this.purchasePrice = await this.contract.purchasePrice();

        expect(this.purchasePrice).to.be.equal(newPrice);
    }

    async purchase(id, amount, limitPrice, publicKey, approveAmount = undefined, signer = undefined) {
        if (signer === undefined) {
            signer = this.owner;
        }

        if (this.auctionState === this.STATE_INACTIVE) {
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
        const remainingItemsBefore = await this.parent.getRemainingNFTs(this.currentId);
        if (remainingItemsBefore <= 0) {
            await expect(this.contract.connect(signer).purchase(id, amount, limitPrice, publicKey)).to.be.revertedWith(
                "Rarity is already sold out",
            );
            throw new Error("Rarity is already sold out");
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
        const paymentTokenBalanceBefore = await this.USDC.balanceOf(signer.address);

        if (approveAmount === undefined) {
            approveAmount = toPay;
        }

        await this.parent.NFTPotionFunds.approve(this.contract.address, approveAmount);

        if (approveAmount < toPay) {
            await expect(this.contract.connect(signer).purchase(id, amount, limitPrice, publicKey)).to.be.revertedWith(
                "ERC20: transfer amount exceeds allowance",
            );
            throw new Error("ERC20: transfer amount exceeds allowance");
        }

        // Logic
        const tx = await this.contract.connect(signer).purchase(id, amount, limitPrice, publicKey);

        // Checks and effects
        await this.parent.NFTPotionCredit._consumeCredit(tx, signer.address, id, amountToPurchase - amountToPay);

        const remainingItemsAfter = await this.contract.getRemainingNFTs(this.currentId);
        const currentCreditAfter = fromBN(await this.parent.NFTPotionCredit.getCredit(signer.address, this.currentId));
        const paymentTokenBalanceAfter = await this.USDC.balanceOf(signer.address);

        expect(remainingItemsAfter).to.be.equal(remainingItemsBefore - amountToPurchase);
        expect(currentCreditAfter).to.be.equal(currentCreditBefore - (amountToPurchase - amountToPay));
        expect(paymentTokenBalanceAfter).to.be.equal(paymentTokenBalanceBefore.sub(toBN(toPay)));

        return { tx, amountToPurchase };
    }
}

module.exports = { NFTPotionDutchAuctionHelper };

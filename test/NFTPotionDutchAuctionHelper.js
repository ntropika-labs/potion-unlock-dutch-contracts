const { expect } = require("chai");
const { ethers } = require("hardhat");
const { fromBN, toBN } = require("./NFTPotionAuctionUtils");

const { NFTPotionHelper } = require("./NFTPotionHelper");
const { NFTPotionFundsHelper } = require("./NFTPotionFundsHelper");
const { NFTPotionAccessListHelper } = require("./NFTPotionAccessListHelper");
const { NFTPotionCreditHelper } = require("./NFTPotionCreditHelper");
const { isConstructorDeclaration } = require("typescript");

class NFTPotionDutchAuctionHelper {
    STATE_INACTIVE = 0;
    STATE_ACTIVE = 1;

    contract;
    NFTPotionContract;
    USDC;

    NFTPotion;
    NFTPotionFunds;
    NFTPotionAccessList;
    NFTPotionCredit;

    owner;

    currentId;
    currentPurchasePrice;
    auctionState;

    constructor(NFTDutchAuctionContract, NFTPotionContract, USDCContract) {
        this.contract = NFTDutchAuctionContract;
        this.NFTPotionContract = NFTPotionContract;
        this.USDC = USDCContract;

        this.currentId = 0;
        this.currentPurchasePrice = 0;
        this.auctionState = this.STATE_INACTIVE;
    }

    async initialize() {
        this.owner = (await ethers.getSigners())[0];

        this.NFTPotion = new NFTPotionHelper(this.NFTPotionContract);
        this.NFTPotionFunds = new NFTPotionFundsHelper(this);
        this.NFTPotionAccessList = new NFTPotionAccessListHelper(this);
        this.NFTPotionCredit = new NFTPotionCreditHelper(this);

        await this.NFTPotion.initialize();
        await this.NFTPotionFunds.initialize();
        await this.NFTPotionAccessList.initialize();
        await this.NFTPotionCredit.initialize();
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

        if (!this.NFTPotion._isValidId(id)) {
            await expect(this.contract.connect(signer).startAuction(id, purchasePrice)).to.be.revertedWith(
                "Invalid rarity ID",
            );
            throw new Error("Invalid rarity ID");
        }

        if ((await this.NFTPotion.getRemainingNFTs(id)) <= 0) {
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
        this.currentPurchasePrice = fromBN(await this.contract.purchasePrice());
        this.auctionState = await this.contract.auctionState();

        expect(this.currentId).to.be.equal(id);
        expect(this.currentPurchasePrice).to.be.equal(purchasePrice);
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
        this.currentPurchasePrice = await this.contract.purchasePrice();

        expect(this.currentPurchasePrice).to.be.equal(newPrice);
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

        const callerHasAccess = await this.NFTPotionAccessList.canAccess(signer.address);
        if (!callerHasAccess) {
            await expect(this.contract.connect(signer).purchase(id, amount, limitPrice, publicKey)).to.be.revertedWith(
                "AccessList: Caller doesn't have access",
            );
            throw new Error("AccessList: Caller doesn't have access");
        }
        const remainingItemsBefore = await this.NFTPotion.getRemainingNFTs(this.currentId);
        if (remainingItemsBefore <= 0) {
            await expect(this.contract.connect(signer).purchase(id, amount, limitPrice, publicKey)).to.be.revertedWith(
                "Rarity is already sold out",
            );
            throw new Error("Rarity is already sold out");
        }

        if (limitPrice < this.currentPurchasePrice) {
            await expect(this.contract.connect(signer).purchase(id, amount, limitPrice, publicKey)).to.be.revertedWith(
                "Current price is higher than limit price",
            );
            throw new Error("Current price is higher than limit price");
        }

        const currentCreditBefore = fromBN(await this.NFTPotionCredit.getCredit(signer.address, this.currentId));
        const amountToPurchase = amount > remainingItemsBefore ? remainingItemsBefore : amount;
        const amountToPay = amountToPurchase > currentCreditBefore ? amountToPurchase - currentCreditBefore : 0;
        const toPay = amountToPay * this.currentPurchasePrice;
        const paymentTokenBalanceBefore = await this.USDC.balanceOf(signer.address);

        if (approveAmount === undefined) {
            approveAmount = toPay;
        }

        await this.NFTPotionFunds.approve(this.contract.address, approveAmount, signer);

        if (approveAmount < toPay) {
            await expect(this.contract.connect(signer).purchase(id, amount, limitPrice, publicKey)).to.be.revertedWith(
                "ERC20: transfer amount exceeds allowance",
            );
            throw new Error("ERC20: transfer amount exceeds allowance");
        }

        // Pre-checks
        const startTokenId = await this.NFTPotion._mintPreCheck(id, amountToPurchase, signer);

        // Logic
        const tx = await this.contract.connect(signer).purchase(id, amount, limitPrice, publicKey);
        await expect(tx)
            .to.emit(this.contract, "NFTPurchased")
            .withArgs(signer.address, startTokenId, amountToPurchase, limitPrice, publicKey);

        // Checks and effects
        await this.NFTPotion._mintPostCheck(id, amountToPurchase, signer);

        await this.NFTPotionCredit._consumeCredit(tx, signer.address, id, amountToPurchase - amountToPay);

        const remainingItemsAfter = await this.NFTPotion.getRemainingNFTs(this.currentId);
        const currentCreditAfter = fromBN(await this.NFTPotionCredit.getCredit(signer.address, this.currentId));
        const paymentTokenBalanceAfter = await this.USDC.balanceOf(signer.address);

        expect(remainingItemsAfter).to.be.equal(remainingItemsBefore - amountToPurchase);
        expect(currentCreditAfter).to.be.equal(currentCreditBefore - (amountToPurchase - amountToPay));
        expect(paymentTokenBalanceAfter).to.be.equal(paymentTokenBalanceBefore.sub(toBN(toPay)));

        return amountToPurchase;
    }

    async purchasePrice() {
        return this.contract.purchasePrice();
    }
}

module.exports = { NFTPotionDutchAuctionHelper };

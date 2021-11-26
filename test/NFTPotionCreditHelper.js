const { expect } = require("chai");
const { ethers } = require("hardhat");

class NFTPotionCreditHelper {
    parent;
    contract;
    owner;

    creditMap;

    constructor(parent) {
        this.parent = parent;
        this.contract = parent.contract;
        this.creditsMap = new Map();
    }

    async initialize() {
        this.owner = (await ethers.getSigners())[0];
    }

    async addCredit(buyer, itemsId, amount, signer = undefined) {
        if (signer === undefined) {
            signer = this.owner;
        } else if (signer !== this.owner) {
            await expect(this.contract.connect(signer).addCredit(buyer, itemsId, amount)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            return;
        }

        // Initial state
        const creditBefore = await this.contract.provider.getCredit(this.contract.address, itemsId);

        // Logic
        await this.contract.connect(signer).addCredit(buyer, itemsId, amount);

        // Checks
        const creditAfter = await this.contract.provider.getCredit(this.contract.address, itemsId);

        expect(creditAfter).to.be.equal(creditBefore.add(amount));
    }

    async addCreditList(buyersList, itemsIdList, amountsList, signer = undefined) {
        if (signer === undefined) {
            signer = this.owner;
        } else if (signer !== this.owner) {
            await expect(
                this.contract.connect(signer).addCredit(buyersList, itemsIdList, amountsList),
            ).to.be.revertedWith("Ownable: caller is not the owner");
            return;
        }

        if (buyersList.length === 0) {
            await expect(
                this.contract.connect(signer).addCredit(buyersList, itemsIdList, amountsList),
            ).to.be.revertedWith("Trying to whitelist with empty array");
            return;
        }

        if (buyersList.length !== amountsList.length || buyersList.length !== itemsIdList.length) {
            await expect(
                this.contract.connect(signer).addCredit(buyersList, itemsIdList, amountsList),
            ).to.be.revertedWith("Mismatch in array sizes for direct whitelist");
            return;
        }

        // Initial state
        let creditsBefore = [];

        for (let i = 0; i < buyersList.length; i++) {
            creditsBefore.push(await this.contract.provider.getCredit(this.contract.address, itemsIdList[i]));
        }

        // Logic
        await this.contract.connect(signer).addCredit(buyersList, itemsIdList, amountsList);

        for (let i = 0; i < buyersList.length; i++) {
            const creditAfter = await this.contract.provider.getCredit(this.contract.address, itemsIdList[i]);
            expect(creditAfter).to.be.equal(creditsBefore[i].add(amountsList[i]));
        }
    }

    async getCredit(buyer, id) {
        return this.contract.getCredit(buyer, id);
    }
}

module.exports = { NFTPotionCreditHelper };

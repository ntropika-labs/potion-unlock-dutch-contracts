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
            throw new Error("Ownable: caller is not the owner");
        }

        // Initial state
        const creditBefore = await this.contract.getCredit(buyer, itemsId);

        // Logic
        await this.contract.connect(signer).addCredit(buyer, itemsId, amount);

        // Checks
        const creditAfter = await this.contract.getCredit(buyer, itemsId);

        expect(creditAfter).to.be.equal(creditBefore.add(amount));

        // Effects
        if (!this.creditsMap.has(buyer)) {
            this.creditsMap.set(buyer, new Map());
        }

        this.creditsMap.get(buyer).set(itemsId, amount);
    }

    async addCreditAll(buyersList, itemsIdList, amountsList, signer = undefined) {
        if (signer === undefined) {
            signer = this.owner;
        } else if (signer !== this.owner) {
            await expect(
                this.contract.connect(signer).addCreditAll(buyersList, itemsIdList, amountsList),
            ).to.be.revertedWith("Ownable: caller is not the owner");
            throw new Error("Ownable: caller is not the owner");
        }

        if (buyersList.length === 0) {
            await expect(
                this.contract.connect(signer).addCreditAll(buyersList, itemsIdList, amountsList),
            ).to.be.revertedWith("Trying to whitelist with empty array");
            throw new Error("Trying to whitelist with empty array");
        }

        if (buyersList.length !== amountsList.length || buyersList.length !== itemsIdList.length) {
            await expect(
                this.contract.connect(signer).addCreditAll(buyersList, itemsIdList, amountsList),
            ).to.be.revertedWith("Mismatch in array sizes for direct whitelist");
            throw new Error("Mismatch in array sizes for direct whitelist");
        }

        // Initial state
        let creditsBefore = [];

        for (let i = 0; i < buyersList.length; i++) {
            creditsBefore.push(await this.contract.getCredit(buyersList[i], itemsIdList[i]));
        }

        // Logic
        await this.contract.connect(signer).addCreditAll(buyersList, itemsIdList, amountsList);

        for (let i = 0; i < buyersList.length; i++) {
            const creditAfter = await this.contract.getCredit(buyersList[i], itemsIdList[i]);
            expect(creditAfter).to.be.equal(creditsBefore[i].add(amountsList[i]));

            if (!this.creditsMap.has(buyersList[i])) {
                this.creditsMap.set(buyersList[i], new Map());
            }

            this.creditsMap.get(buyersList[i]).set(itemsIdList[i], amountsList[i]);
        }
    }

    _consumeCredit(buyer, id, amount) {
        if (!this.creditsMap.has(buyer)) {
            expect(amount).to.be.equal(0);
            return;
        }
        if (!this.creditsMap.get(buyer).has(id)) {
            expect(amount).to.be.equal(0);
            return;
        }

        const credit = this.creditsMap.get(buyer).get(id);
        expect(credit).to.be.greaterThanOrEqual(amount);

        this.creditsMap.get(buyer).set(id, credit - amount);
    }

    async getCredit(buyer, id) {
        if (!this.creditsMap.has(buyer)) {
            return 0;
        }
        if (!this.creditsMap.get(buyer).has(id)) {
            return 0;
        }
        return this.creditsMap.get(buyer).get(id);
    }
}

module.exports = { NFTPotionCreditHelper };

const { expect } = require("chai");
const { ethers } = require("hardhat");

class NFTPotionAccessListHelper {
    parent;
    contract;
    owner;

    constructor(parent) {
        this.parent = parent;
        this.contract = parent.contract;
    }

    async initialize() {
        this.owner = (await ethers.getSigners())[0];
    }

    async canAccess(caller) {
        return await this.contract.canAccess(caller);
    }

    async setAccess(caller, canAccess, signer = undefined) {
        if (signer === undefined) {
            signer = this.owner;
        } else if (signer !== this.owner) {
            await expect(this.contract.connect(signer).setAccess(caller, canAccess)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            return;
        }

        // Logic
        await this.contract.connect(signer).setAccess(caller, canAccess);

        // Checks
        const canAccessAfter = await this.contract.canAccess(caller);

        expect(canAccessAfter).to.be.equal(canAccess);
    }

    async setAccessList(customerList, canAccess, signer = undefined) {
        if (signer === undefined) {
            signer = this.owner;
        } else if (signer !== this.owner) {
            await expect(this.contract.connect(signer).setAccess(customerList, canAccess)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            return;
        }

        // Logic
        const tx = await this.contract.connect(signer).setAccess(customerList, canAccess);
        await tx.wait();

        // Checks
        for (const caller of customerList) {
            const canAccessAfter = await this.contract.canAccess(caller);
            expect(canAccessAfter).to.be.equal(canAccess);
        }
    }
}

module.exports = { NFTPotionAccessListHelper };

const { expect } = require("chai");
const { ethers } = require("hardhat");

class NFTPotionFundsHelper {
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

    async transferFunds(recipient, signer = undefined) {
        if (signer === undefined) {
            signer = this.owner;
        } else if (signer !== this.owner) {
            await expect(this.contract.connect(signer).transferFunds(recipient)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            throw new Error("Ownable: caller is not the owner");
        }

        // Initial state
        const contractBalance = await this.contract.provider.getBalance(this.contract.address);
        const recipientBalance = await this.contract.provider.getBalance(recipient);

        // Logic
        const tx = await this.contract.connect(signer).transferFunds(recipient);
        const receipt = await tx.wait();
        const gasCost = receipt.gasUsed.mul(receipt.effectiveGasPrice);

        // Checks
        const contractBalanceAfter = await this.contract.provider.getBalance(this.contract.address);
        const recipientBalanceAfter = await this.contract.provider.getBalance(recipient);

        expect(contractBalanceAfter).to.be.equal(0);

        if (recipient === signer.address) {
            expect(recipientBalanceAfter).to.be.equal(recipientBalance.add(contractBalance).sub(gasCost));
        } else {
            expect(recipientBalanceAfter).to.be.equal(recipientBalance.add(contractBalance));
        }
    }

    async sendUnrequestedFunds(amount, signer) {
        if (signer === undefined) {
            signer = (await ethers.getSigners())[0];
        }

        // Logic
        await expect(
            signer.sendTransaction({
                from: signer.address,
                to: this.contract.address,
                value: amount,
            }),
        ).to.be.revertedWith("NFTPotionFunds: Unrequested funds received");
    }
}

module.exports = { NFTPotionFundsHelper };

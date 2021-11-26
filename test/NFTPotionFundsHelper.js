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
            return;
        }

        // Initial state
        const contractBalance = await this.contract.provider.getBalance(this.contract.address);
        const recipientBalance = await this.contract.provider.getBalance(recipient);

        // Logic
        const tx = await this.contract.connect(signer).transferFunds(recipient);
        const receipt = await tx.wait();
        const gasCost = receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice);

        // Checks
        const contractBalanceAfter = await this.contract.provider.getBalance(this.contract.address);
        const recipientBalanceAfter = await this.contract.provider.getBalance(recipient);
        const unrequestedFundsAfter = await this.contract.unrequestedFundsReceived();

        expect(contractBalanceAfter).to.be.equal(0);
        expect(unrequestedFundsAfter).to.be.equal(0);

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

        // Initial state
        const contractBalance = await this.contract.provider.getBalance(this.contract.address);
        const senderBalance = await signer.getBalance();
        const unrequestedFunds = await this.contract.unrequestedFundsReceived();

        // Logic
        const tx = await signer.sendTransaction({
            from: signer.address,
            to: this.contract.address,
            value: amount,
        });
        const receipt = await tx.wait();
        const gasCost = receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice);

        // Checks
        const contractBalanceAfter = await this.contract.provider.getBalance(this.contract.address);
        const senderBalanceAfter = await signer.getBalance();
        const unrequestedFundsAfter = await this.contract.unrequestedFundsReceived();

        expect(contractBalanceAfter).to.be.equal(contractBalance.add(amount));
        expect(unrequestedFundsAfter).to.be.equal(unrequestedFunds.add(amount));

        expect(senderBalanceAfter).to.be.equal(senderBalance.sub(amount).sub(gasCost));
    }
}

module.exports = { NFTPotionFundsHelper };

const { expect } = require("chai");
const { ethers } = require("hardhat");

class NFTPotionFundsHelper {
    parent;
    contract;
    owner;

    constructor(parent) {
        this.parent = parent;
        this.contract = parent.contract;
        this.USDC = parent.USDC;
    }

    async initialize() {
        this.owner = (await ethers.getSigners())[0];
    }

    async transferFunds(recipient, amount = undefined, signer = undefined) {
        // Initial state
        const contractBalance = await this.USDC.balanceOf(this.contract.address);
        const recipientBalance = await this.USDC.balanceOf(recipient);

        const amountToTransfer = amount === undefined ? contractBalance : amount;

        if (signer === undefined) {
            signer = this.owner;
        } else if (signer !== this.owner) {
            await expect(this.contract.connect(signer).transferFunds(recipient, amountToTransfer)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            throw new Error("Ownable: caller is not the owner");
        }

        if (amountToTransfer.gt(contractBalance)) {
            await expect(this.contract.connect(signer).transferFunds(recipient, amountToTransfer)).to.be.revertedWith(
                "ERC20: transfer amount exceeds balance",
            );
            throw new Error("ERC20: transfer amount exceeds balance");
        }

        // Logic
        await this.contract.connect(signer).transferFunds(recipient, amountToTransfer);

        // Checks
        const contractBalanceAfter = await this.USDC.balanceOf(this.contract.address);
        const recipientBalanceAfter = await this.USDC.balanceOf(recipient);

        expect(contractBalanceAfter).to.be.equal(contractBalance.sub(amountToTransfer));
        expect(recipientBalanceAfter).to.be.equal(recipientBalance.add(amountToTransfer));
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

    async approve(spender, amount, signer = undefined) {
        if (signer === undefined) {
            signer = (await ethers.getSigners())[0];
        }

        // Logic
        return this.USDC.connect(signer).approve(spender, amount);
    }
}

module.exports = { NFTPotionFundsHelper };

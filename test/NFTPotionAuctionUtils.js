const { expect } = require("chai");
const { ethers } = require("hardhat");
const { formatUnits } = require("ethers/lib/utils");
const { BigNumber } = require("@ethersproject/bignumber");

async function chainEpoch(timeFromNow = 0) {
    return (await ethers.provider.getBlock("latest")).timestamp + timeFromNow;
}

async function getEventTimestamp(eventName, tx) {
    const receipt = await tx.wait();

    const events = receipt.events?.filter(x => {
        return x.event === eventName;
    });

    expect(events.length).to.be.greaterThanOrEqual(1);

    const batchStartedEvent = events[0];
    const eventBlock = await batchStartedEvent.getBlock();
    return eventBlock.timestamp;
}

async function fastForwardChain(seconds) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
}

function fromBN(bn) {
    const value = formatUnits(bn, "wei");
    try {
        return parseInt(value);
    } catch {
        return value;
    }
}

function fromBNStr(bn) {
    return formatUnits(bn, "wei");
}

function toBN(number) {
    return BigNumber.from(number);
}

function getBidderAddress(bidderNumber) {
    //return ethers.Wallet.createRandom().address;
    return "0x" + bidderNumber.toString().padStart(40, "0");
}

function generatePrice(minimumPrice, purchasePrice, factor, index) {
    return ((minimumPrice + factor * index) % (purchasePrice - minimumPrice)) + minimumPrice;
}

module.exports = {
    chainEpoch,
    getEventTimestamp,
    fastForwardChain,
    fromBN,
    fromBNStr,
    toBN,
    getBidderAddress,
    generatePrice,
};

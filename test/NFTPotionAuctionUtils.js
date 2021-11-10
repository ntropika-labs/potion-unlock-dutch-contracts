const { expect } = require("chai");
const { ethers } = require("hardhat");
const { formatUnits } = require("ethers/lib/utils");

async function epochNow() {
    return (await ethers.provider.getBlock("latest")).timestamp;
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
    return Number(formatUnits(bn, "wei"));
}

function getBidderAddress(bidderNumber) {
    //return ethers.Wallet.createRandom().address;
    return "0x" + bidderNumber.toString().padStart(40, "0");
}

module.exports = {
    epochNow,
    getEventTimestamp,
    fastForwardChain,
    fromBN,
    getBidderAddress,
};

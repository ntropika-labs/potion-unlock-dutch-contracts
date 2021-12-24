const { expect, assert } = require("chai");
const seedrandom = require("seedrandom");
const { ethers } = require("hardhat");

const { NFTPotionDutchAuctionHelper } = require("./NFTPotionDutchAuctionHelper");
const { deployNFTContract, deployMockUSDC, deployDutchAuction, deployNFTValidator } = require("../scripts/deployUtils");

function initRandom(seed = undefined) {
    if (seed === undefined) {
        seed = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    }
    const getRandomFloat = seedrandom(seed);
    const getRandom = () => Math.floor(getRandomFloat() * Number.MAX_SAFE_INTEGER);

    return { seed, getRandom };
}

function shuffle(array, getRandom) {
    return array.sort((a, b) => getRandom() / Number.MAX_SAFE_INTEGER - 0.5);
}

function range(start, end) {
    return Array.from(new Array(end - start + 1).keys()).map(item => start + item);
}

async function expectThrow(async_fn, error_msg) {
    try {
        await async_fn();
    } catch (error) {
        expect(error.message).to.equal(error_msg);
        return;
    }

    assert.fail("Should have thrown error: " + error_msg);
}

async function deployUSDCContract(signers, ethAmount) {
    const USDC = await deployMockUSDC();

    for (const signer of signers) {
        await USDC.mint(signer.address, ethers.utils.parseEther(ethAmount));
    }

    return USDC;
}

async function deployDutchAuctionContracts(USDC) {
    const { NFTPotion } = await deployNFTContract(true);
    const { NFTDutchAuction } = await deployDutchAuction(NFTPotion, USDC, true);

    const auction = new NFTPotionDutchAuctionHelper(NFTDutchAuction, NFTPotion, USDC);
    await auction.initialize();

    return auction;
}

async function deployFullGameContracts(USDC) {
    const { NFTPotion } = await deployNFTContract(true);
    const { NFTDutchAuction } = await deployDutchAuction(NFTPotion, USDC, true);
    const { NFTValidator } = await deployNFTValidator(NFTPotion.address, true);

    const NFTDutchAuctionHelper = new NFTPotionDutchAuctionHelper(NFTDutchAuction, NFTPotion, USDC);
    await NFTDutchAuctionHelper.initialize();

    return { NFTDutchAuctionHelper, NFTValidator };
}

module.exports = {
    range,
    expectThrow,
    initRandom,
    shuffle,
    deployDutchAuctionContracts,
    deployUSDCContract,
    deployFullGameContracts,
};

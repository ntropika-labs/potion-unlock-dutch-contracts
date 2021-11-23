const { ethers } = require("hardhat");

const { exportContract } = require("./lib/utils");

require("dotenv").config();

async function main() {
    const NFTPotionWhitelistFactory = await ethers.getContractFactory("NFTPotionWhitelist");
    let NFTPotionWhitelist = await NFTPotionWhitelistFactory.deploy();

    await NFTPotionWhitelist.deployed();

    exportContract("NFTPotionWhitelist", NFTPotionWhitelist.address);

    console.log("Potion NFT Whitelist Contract deployed to:", NFTPotionWhitelist.address);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

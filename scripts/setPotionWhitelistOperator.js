const { ethers } = require("hardhat");

const Deployments = require("../src/deployments.json");

require("dotenv").config();

async function main() {
    const NFTPotionWhitelistFactory = await ethers.getContractFactory("NFTPotionWhitelist");
    let NFTPotionWhitelist = await NFTPotionWhitelistFactory.attach(Deployments.NFTPotionWhitelist);

    await NFTPotionWhitelist.addOperator("0x919a8fC953405E22Ed730395fAD1deAb4d1a51dD");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

const { ethers } = require("hardhat");

const Deployments = require("../src/deployments.json");

require("dotenv").config();

async function main() {
    const NFTPotionWhitelistFactory = await ethers.getContractFactory("NFTPotionWhitelist");
    let NFTPotionWhitelist = await NFTPotionWhitelistFactory.attach(Deployments.NFTPotionWhitelist);

    const addresses = [
        "0xc892cfd3e75Cf428BDD25576e9a42D515697B2C7",
        "0x5c8C6e3eB6aA9d0e7ae6882045b1924deb4ecE94",
        "0xDe0376310ba116F850CC783D039f5e00208F40fd",
        "0xF9D5169aA864C1Ddda2Aba931Edf722f98B2D159",
    ];

    await Promise.all(
        addresses.map(async address => {
            const ranges = await NFTPotionWhitelist.getWhitelistRanges(address);
            console.log(`${address}:`, ranges);
        }),
    );
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

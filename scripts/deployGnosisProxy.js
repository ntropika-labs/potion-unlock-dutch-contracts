const { ethers } = require("hardhat");

const { exportContract } = require("./lib/utils");
const Deployments = require("../src/deployments.json");

require("dotenv").config();

async function main() {
    const NFTPotionWhitelistFactory = await ethers.getContractFactory("NFTPotionWhitelist");
    let NFTPotionWhitelist = await NFTPotionWhitelistFactory.attach(Deployments.NFTPotionWhitelist);

    const NFTGnosisProxyFactory = await ethers.getContractFactory("NFTGnosisProxy");
    let NFTGnosisProxy = await NFTGnosisProxyFactory.deploy(
        "Rarity1",
        "PR1",
        1,
        3,
        NFTPotionWhitelist.address,
        "0xC5992c0e0A3267C7F75493D0F717201E26BE35f7",
    );

    await NFTGnosisProxy.deployed();

    exportContract("NFTGnosisWhitelist", NFTGnosisProxy.address);

    await NFTPotionWhitelist.addOperator(NFTGnosisProxy.address);

    console.log("Potion NFT ERC20 Proxy Contract deployed to:", NFTGnosisProxy.address);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

const hre = require("hardhat");

require("dotenv").config();

const { exportContract } = require("./utils");
const { CONTRACTS_DEPLOYMENTS_FILE } = require("./config");
const { NFTContract } = require(`../${CONTRACTS_DEPLOYMENTS_FILE}`);

async function deployAuction(hre, NFTContractAddress, biddingTokenAddress) {
    const NFTAuctionFactory = await hre.ethers.getContractFactory("NFTAuction");
    let NFTAuction = await NFTAuctionFactory.deploy(biddingTokenAddress);

    await NFTAuction.deployed();
    console.log(`Auction Contract deployed to: ${NFTAuction.address}`);

    exportContract("NFTAuction", NFTAuction.address);

    return NFTAuction;
}

async function deployWETH(hre) {
    const WETHFactory = await hre.ethers.getContractFactory("MockWETH");
    let MockWETH = await WETHFactory.deploy();

    await MockWETH.deployed();
    console.log(`MockWETH Contract deployed to: ${MockWETH.address}`);

    exportContract("MockWETH", MockWETH.address);

    return MockWETH;
}

async function main() {
    const mockWETH = await deployWETH(hre);
    await deployAuction(hre, NFTContract, mockWETH.address);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

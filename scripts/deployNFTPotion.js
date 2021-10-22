const hre = require("hardhat");

require("dotenv").config();

const { getMetamaskPublicKey, encryptPassword, exportContract } = require("./utils");
const { NFT_NAME, NFT_SYMBOL, NUM_NFTS, SOURCE_CODE_PASSWORD, IPFS_PREFIX, IPFS_SUFFIX } = require("./config");

async function deployAuction(hre, biddingTokenAddress) {
    const NFTAuctionFactory = await hre.ethers.getContractFactory("NFTPotionAuction");
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

async function deployNFTContract(hre, NFTAuctionContract, secret) {
    console.log("Secret: " + secret);
    const NFTPotionFactory = await hre.ethers.getContractFactory("NFTPotion");
    let NFTPotion = await NFTPotionFactory.deploy(
        NFT_NAME,
        NFT_SYMBOL,
        IPFS_PREFIX,
        IPFS_SUFFIX,
        NUM_NFTS,
        secret,
        NFTAuctionContract.address,
    );

    await NFTPotion.deployed();
    console.log("Potion NFT Contract deployed to:", NFTPotion.address);

    exportContract("NFTPotion", NFTPotion.address);

    return NFTPotion;
}

async function testMinting(NFTPotion) {
    let publicKey = getMetamaskPublicKey();

    for (let i = 1; i <= NUM_NFTS; i++) {
        const tx = await NFTPotion.mint(publicKey);
        await tx.wait();
    }

    const totalDeployedTokens = (await NFTPotion.nextTokenId()) - 1;
    console.log(`Total Deployed NFTS: ${totalDeployedTokens}`);
    for (let i = 1; i <= totalDeployedTokens; i++) {
        console.log("--------------------------------------");
        console.log(`Token ID: ${i}`);
        console.log(`URI: ${await NFTPotion.tokenURI(i)}`);
        console.log(`Secret: ${await NFTPotion.secret(i)}`);
    }
    console.log("--------------------------------------");
}

async function main() {
    // Auction contract
    const mockWETH = await deployWETH(hre);
    const NFTAuction = await deployAuction(hre, mockWETH.address);

    const encryptedPassword = encryptPassword(SOURCE_CODE_PASSWORD);
    const NFTPotion = await deployNFTContract(hre, NFTAuction, encryptedPassword);
    //await testMinting(NFTPotion);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

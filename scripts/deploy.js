const hre = require("hardhat");
const fs = require("fs");
const { ethers } = require("hardhat");
const { toBuffer } = require("ethereumjs-util");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Config
const NFT_NAME = "Potion NFT Game 1";
const NFT_SYMBOL = "PNFT1";
const NUM_NFTS = 5;
const SECRET = "0x12345678901234567890";

async function main() {
    const wallet = new ethers.Wallet(PRIVATE_KEY);
    const publicKeyECDSA = wallet.publicKey;
    console.log(publicKeyECDSA);
    const publicKeyBufferECDSA = toBuffer(publicKeyECDSA);

    var publicKey = publicKeyBufferECDSA.slice(1);
    console.log(publicKey);

    // DEPLOY SECRET NFTs AND GET MERKLE TREE LEAFS
    const NFTFactory = await hre.ethers.getContractFactory("SVGNFT");
    //NFTFactory.connect(nftDeployer)
    let NFTContract = await NFTFactory.deploy(NFT_NAME, NFT_SYMBOL, NUM_NFTS, SECRET);

    await NFTContract.deployed();
    console.log("Potion NFT Contract deployed to:", NFTContract.address);

    /*for (let i = 1; i <= NUM_NFTS; i++) {
        const svgURI = "https://ipfs.io/TESTCID-" + i;

        const tx = await NFTContract.mint(svgURI, publicKey);
        await tx.wait();
    }

    const totalDeployedTokens = (await NFTContract.nextTokenId()) - 1;
    console.log(`Total Deployed NFTS: ${totalDeployedTokens}`);
    for (let i = 1; i <= totalDeployedTokens; i++) {
        console.log("--------------------------------------");
        console.log(`Token ID: ${i}`);
        console.log(`URI: ${await NFTContract.tokenURI(i)}`);
        console.log(`Secret: ${await NFTContract.secret(i)}`);
    }
    console.log("--------------------------------------");
    */
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

const hre = require("hardhat");

require("dotenv").config();

const { getMetamaskPublicKey, encryptPassword, exportContract } = require("./utils");
const { NFT_NAME, NFT_SYMBOL, NUM_NFTS, SOURCE_CODE_PASSWORD, IPFS_PREFIX, IPFS_SUFFIX } = require("./config");

async function deployNFTContract(hre, secret) {
    const NFTFactory = await hre.ethers.getContractFactory("SVGNFT");
    let NFTContract = await NFTFactory.deploy(NFT_NAME, NFT_SYMBOL, IPFS_PREFIX, IPFS_SUFFIX, NUM_NFTS, secret);

    await NFTContract.deployed();
    console.log("Potion NFT Contract deployed to:", NFTContract.address);

    exportContract("NFTContract", NFTContract.address);

    return NFTContract;
}

async function testMinting(NFTContract) {
    let publicKey = getMetamaskPublicKey();

    for (let i = 1; i <= NUM_NFTS; i++) {
        const tx = await NFTContract.mint(publicKey);
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
}

async function main() {
    const encryptedPassword = encryptPassword(SOURCE_CODE_PASSWORD);
    console.log(encryptedPassword);
    const NFTContract = await deployNFTContract(hre, encryptedPassword);
    console.log(encryptedPassword.length);
    await testMinting(NFTContract);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

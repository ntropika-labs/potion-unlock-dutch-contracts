const hre = require("hardhat");

require("dotenv").config();

const { getMetamaskPublicKey, encryptSecret, buildMerkleTree } = require("./utils");
const { NFT_NAME, NFT_SYMBOL, NUM_NFTS, MESSAGE } = require("./config");

async function deployNFTContract(hre, secret) {
    const NFTFactory = await hre.ethers.getContractFactory("SVGNFT");
    let NFTContract = await NFTFactory.deploy(NFT_NAME, NFT_SYMBOL, NUM_NFTS, Buffer.from(secret));

    await NFTContract.deployed();
    console.log("Potion NFT Contract deployed to:", NFTContract.address);

    return NFTContract;
}

async function testMinting(NFTContract) {
    let publicKey = getMetamaskPublicKey();

    for (let i = 1; i <= NUM_NFTS; i++) {
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
}

async function deployNFTValidator(hre, NFTContract, merkleTree) {
    const merkleRoot = merkleTree.getHexRoot();

    const NFTValidatorFactory = await hre.ethers.getContractFactory("NFTValidator");
    let NFTValidator = await NFTValidatorFactory.deploy(NFTContract.address, merkleRoot, NUM_NFTS);

    await NFTValidator.deployed();
    console.log(`Validator Contract deployed to: ${NFTValidator.address}`);
    console.log(`Merkle Root: ${merkleRoot}`);

    return NFTValidator;
}

async function main() {
    let secret = encryptSecret(MESSAGE);
    const merkleTree = buildMerkleTree(MESSAGE);

    let NFTContract = await deployNFTContract(hre, secret);
    await deployNFTValidator(hre, NFTContract, merkleTree);

    await testMinting(NFTContract);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

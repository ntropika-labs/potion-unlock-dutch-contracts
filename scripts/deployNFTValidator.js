const hre = require("hardhat");

require("dotenv").config();

const { buildMerkleTree, getPrivateKey } = require("./utils");
const { NUM_NFTS } = require("./config");

const NFTContractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

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
    const potionPrivateKey = getPrivateKey();
    const merkleTree = buildMerkleTree(potionPrivateKey);

    await deployNFTValidator(hre, NFTContractAddress, merkleTree);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

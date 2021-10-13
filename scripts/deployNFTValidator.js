const hre = require("hardhat");

require("dotenv").config();

const { buildMerkleTree, getPotionPrivateKey, exportContract } = require("./utils");
const { NUM_NFTS } = require("./config");

const NFTContractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

async function deployNFTValidator(hre, NFTContractAddress, merkleTree, partialSecretSize) {
    const merkleRoot = merkleTree.getHexRoot();

    const NFTValidatorFactory = await hre.ethers.getContractFactory("NFTValidator");
    let NFTValidator = await NFTValidatorFactory.deploy(NFTContractAddress, merkleRoot, NUM_NFTS, partialSecretSize);

    await NFTValidator.deployed();
    console.log(`Validator Contract deployed to: ${NFTValidator.address}`);
    console.log(`Merkle Root: ${merkleRoot}`);

    exportContract("NFTValidator", NFTValidator.address);

    return NFTValidator;
}

async function main() {
    const potionPrivateKey = getPotionPrivateKey();
    const merkleTree = buildMerkleTree(potionPrivateKey, NUM_NFTS);

    const partialSecretSize = potionPrivateKey.length / NUM_NFTS;

    await deployNFTValidator(hre, NFTContractAddress, merkleTree, partialSecretSize);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

const { ethers } = require("hardhat");

require("dotenv").config();

const {
    encryptPassword,
    buildMerkleTree,
    getPotionGenesis,
    exportContract,
    getRaritiesConfig,
    encodeRarityConfig,
} = require("./lib/utils");
const { NFT_NAME, NFT_SYMBOL, IPFS_PREFIX, IPFS_SUFFIX } = require("./config");

// Enable/disable console.log
const EnableConsoleLog = console.log;
const DisableConsoleLog = function () {};
console.log = EnableConsoleLog;

async function deployAuction(enableExport = true) {
    const NFTAuctionFactory = await ethers.getContractFactory("NFTPotionAuction");
    let NFTAuction = await NFTAuctionFactory.deploy();

    await NFTAuction.deployed();

    console.log(`Auction Contract deployed to: ${NFTAuction.address}`);
    if (enableExport) {
        exportContract("NFTPotionAuction", NFTAuction.address);
    }

    return NFTAuction;
}

async function deployNFTContract(secret, rarityConfig, enableExport = true) {
    const NFTPotionFactory = await ethers.getContractFactory("NFTPotion");
    let NFTPotion = await NFTPotionFactory.deploy(NFT_NAME, NFT_SYMBOL, IPFS_PREFIX, IPFS_SUFFIX, secret, rarityConfig);

    await NFTPotion.deployed();

    console.log("Potion NFT Contract deployed to:", NFTPotion.address);
    if (enableExport) {
        exportContract("NFTPotion", NFTPotion.address);
    }

    return NFTPotion;
}

async function deployNFTValidator(NFTContractAddress, merkleTree, enableExport = true) {
    const merkleRoot = merkleTree.getHexRoot();

    const NFTValidatorFactory = await ethers.getContractFactory("NFTPotionValidator");
    let NFTPotionValidator = await NFTValidatorFactory.deploy(NFTContractAddress, merkleRoot);

    await NFTPotionValidator.deployed();

    console.log(`Validator Contract deployed to: ${NFTPotionValidator.address}`);
    if (enableExport) {
        exportContract("NFTPotionValidator", NFTPotionValidator.address);
    }

    return NFTPotionValidator;
}

async function deployPotionNFTGame(showLogs = true, enableExport = true) {
    if (showLogs) {
        console.log = EnableConsoleLog;
    } else {
        console.log = DisableConsoleLog;
    }

    // Rarities
    const raritiesConfig = getRaritiesConfig();
    const raritiesConfigSolidity = encodeRarityConfig(raritiesConfig);

    // Genesis
    const potionGenesis = getPotionGenesis();

    // Source code password
    const encryptedPassword = encryptPassword(process.env.PASSWORD_GENESIS);
    const encryptedPasswordLength = Buffer.from(encryptedPassword.slice(2), "hex").length;

    if (encryptedPasswordLength !== potionGenesis.length) {
        console.log(
            `Encrypted source code password length (${encryptedPasswordLength}) is different from Potion Genesis length (${potionGenesis.length})`,
        );
        return;
    }

    console.log(`\nEncrypted Password: ${encryptedPassword}\n\n`);

    // Merkle tree
    const { merkleTree } = buildMerkleTree(potionGenesis, raritiesConfig);
    console.log(`Merkle Tree root: ${merkleTree.getHexRoot()}\n\n`);

    // NFT contract
    const NFTPotion = await deployNFTContract(encryptedPassword, raritiesConfigSolidity, enableExport);

    // Validator contract
    const NFTValidator = await deployNFTValidator(NFTPotion.address, merkleTree, enableExport);

    console.log = EnableConsoleLog;

    return { NFTPotion, NFTValidator, encryptedPassword };
}

module.exports = { deployAuction, deployNFTContract, deployNFTValidator, deployPotionNFTGame };

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

async function deployNFTContract(NFTAuctionContract, secret, rarityConfig, enableExport = true) {
    const NFTPotionFactory = await ethers.getContractFactory("NFTPotion");
    let NFTPotion = await NFTPotionFactory.deploy(
        NFT_NAME,
        NFT_SYMBOL,
        IPFS_PREFIX,
        IPFS_SUFFIX,
        secret,
        NFTAuctionContract.address,
        rarityConfig,
    );

    await NFTPotion.deployed();

    console.log("Potion NFT Contract deployed to:", NFTPotion.address);
    if (enableExport) {
        exportContract("NFTPotion", NFTPotion.address);
    }

    return NFTPotion;
}

async function deployNFTV2Contract(secret, rarityConfig, enableExport = true) {
    const NFTPotionV2Factory = await ethers.getContractFactory("NFTPotionV2");
    let NFTPotionV2 = await NFTPotionV2Factory.deploy(
        NFT_NAME,
        NFT_SYMBOL,
        IPFS_PREFIX,
        IPFS_SUFFIX,
        secret,
        rarityConfig,
    );

    await NFTPotionV2.deployed();

    console.log("Potion NFT V2 Contract deployed to:", NFTPotionV2.address);
    if (enableExport) {
        exportContract("NFTV2Potion", NFTPotionV2.address);
    }

    return NFTPotionV2;
}

async function deployNFTValidator(NFTContractAddress, merkleTree, secret, enableExport = true) {
    const merkleRoot = merkleTree.getHexRoot();

    const NFTValidatorFactory = await ethers.getContractFactory("NFTPotionValidator");
    let NFTValidator = await NFTValidatorFactory.deploy(NFTContractAddress, merkleRoot, secret.length);

    await NFTValidator.deployed();

    console.log(`Validator Contract deployed to: ${NFTValidator.address}`);
    if (enableExport) {
        exportContract("NFTPotionValidator", NFTValidator.address);
    }

    return NFTValidator;
}

async function deployNFTValidatorV2(NFTContractAddress, merkleTree, enableExport = true) {
    const merkleRoot = merkleTree.getHexRoot();

    const NFTValidatorV2Factory = await ethers.getContractFactory("NFTPotionValidatorV2");
    let NFTPotionValidatorV2 = await NFTValidatorV2Factory.deploy(NFTContractAddress, merkleRoot);

    await NFTPotionValidatorV2.deployed();

    console.log(`Validator Contract deployed to: ${NFTPotionValidatorV2.address}`);
    if (enableExport) {
        exportContract("NFTPotionValidator", NFTPotionValidatorV2.address);
    }

    return NFTPotionValidatorV2;
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

    // Auction contract
    const NFTAuction = await deployAuction(enableExport);

    // NFT contract
    const NFTPotion = await deployNFTContract(NFTAuction, encryptedPassword, raritiesConfigSolidity, enableExport);

    // Validator contract
    const NFTValidator = await deployNFTValidator(NFTPotion.address, merkleTree, potionGenesis, enableExport);

    console.log = EnableConsoleLog;

    return { NFTAuction, NFTPotion, NFTValidator, encryptedPassword };
}

async function deployPotionNFTV2Game(showLogs = true, enableExport = true) {
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

    // NFT V2 contract
    const NFTPotionV2 = await deployNFTV2Contract(encryptedPassword, raritiesConfigSolidity, enableExport);

    // Validator contract
    const NFTValidatorV2 = await deployNFTValidatorV2(NFTPotionV2.address, merkleTree, enableExport);

    console.log = EnableConsoleLog;

    return { NFTPotionV2, NFTValidatorV2, encryptedPassword };
}

module.exports = { deployAuction, deployNFTContract, deployNFTValidator, deployPotionNFTGame, deployPotionNFTV2Game };

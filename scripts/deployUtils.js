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
const { NFT_NAME, NFT_SYMBOL, USDC_ADDRESS } = require("./config");

// Enable/disable console.log
const EnableConsoleLog = console.log;
const DisableConsoleLog = function () {};
console.log = EnableConsoleLog;

function _configureLogs(isTest) {
    if (!isTest) {
        console.log = EnableConsoleLog;
    } else {
        console.log = DisableConsoleLog;
    }
}

function _restoreLogs() {
    console.log = EnableConsoleLog;
}

async function deployNFTContract(isTest = false) {
    _configureLogs(isTest);

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

    // USDC
    let USDC = USDC_ADDRESS;
    if (isTest) {
        USDC = await deployMockUSDC();
    }

    // Deploy the contract
    const NFTPotionFactory = await ethers.getContractFactory("NFTPotion");
    let NFTPotion = await NFTPotionFactory.deploy(
        NFT_NAME,
        NFT_SYMBOL,
        process.env.IPFS_PREFIX,
        process.env.IPFS_SUFFIX,
        encryptedPassword,
        USDC,
        raritiesConfigSolidity,
    );

    await NFTPotion.deployed();

    console.log("Potion NFT Contract deployed to:", NFTPotion.address);
    if (!isTest) {
        exportContract("NFTPotion", NFTPotion.address);
    }

    _restoreLogs();

    return { NFTPotion, USDC, encryptedPassword };
}

async function deployNFTValidator(NFTContractAddress, isTest = false) {
    _configureLogs(isTest);

    // Rarities
    const raritiesConfig = getRaritiesConfig();

    // Genesis
    const potionGenesis = getPotionGenesis();

    // Merkle tree
    const { merkleTree } = buildMerkleTree(potionGenesis, raritiesConfig);
    console.log(`Merkle Tree root: ${merkleTree.getHexRoot()}\n\n`);

    // Deploy contract
    const NFTValidatorFactory = await ethers.getContractFactory("NFTPotionValidator");
    let NFTPotionValidator = await NFTValidatorFactory.deploy(NFTContractAddress, merkleTree.getHexRoot());

    await NFTPotionValidator.deployed();

    console.log(`Validator Contract deployed to: ${NFTPotionValidator.address}`);
    if (!isTest) {
        exportContract("NFTPotionValidator", NFTPotionValidator.address);
    }

    _restoreLogs();

    return NFTPotionValidator;
}

async function deployMockUSDC() {
    _configureLogs(true);

    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    let MockUSDC = await MockUSDCFactory.deploy();

    await MockUSDC.deployed();

    console.log(`MockUSDC Contract deployed to: ${MockUSDC.address}`);

    _restoreLogs();

    return MockUSDC;
}

async function deployPotionNFTGame(isTest = false) {
    // NFT contract
    const { NFTPotion, USDC, encryptedPassword } = await deployNFTContract(isTest);

    // Validator contract
    const NFTValidator = await deployNFTValidator(NFTPotion.address, isTest);

    return { NFTPotion, NFTValidator, USDC, encryptedPassword };
}

module.exports = { deployNFTContract, deployNFTValidator, deployPotionNFTGame };

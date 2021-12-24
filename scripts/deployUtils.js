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

    // Deploy the contract
    const NFTPotionFactory = await ethers.getContractFactory("NFTPotion");
    let NFTPotion = await NFTPotionFactory.deploy(
        NFT_NAME,
        NFT_SYMBOL,
        process.env.IPFS_PREFIX,
        process.env.IPFS_SUFFIX,
        encryptedPassword,
        raritiesConfigSolidity,
    );

    await NFTPotion.deployed();

    console.log("Potion NFT Contract deployed to:", NFTPotion.address);
    if (!isTest) {
        exportContract("NFTPotion", NFTPotion.address);
    }

    _restoreLogs();

    return { NFTPotion, encryptedPassword };
}

async function deployDutchAuction(NFTContract, deployedUSDC = undefined, isTest = false) {
    _configureLogs(isTest);

    // USDC
    //
    // Value can be passed as a parameter. If it is not passed then
    // fetch it internally (which will in turn deploy it or use the
    // mainnet one
    let USDC = deployedUSDC;
    if (USDC === undefined) {
        USDC = await _getUSDC(isTest);
    }

    // Deploy the contract
    const NFTDutchAuctionFactory = await ethers.getContractFactory("NFTPotionDutchAuction");
    let NFTDutchAuction = await NFTDutchAuctionFactory.deploy(NFTContract.address, USDC.address);

    await NFTDutchAuction.deployed();

    console.log("Potion Dutch Auction Contract deployed to:", NFTDutchAuction.address);
    if (!isTest) {
        exportContract("NFTPotionDutchAuction", NFTDutchAuction.address);
    }

    // Set the auction contract as the NFT Contract owner
    await NFTContract.transferOwnership(NFTDutchAuction.address);

    _restoreLogs();

    return { NFTDutchAuction, USDC };
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
    let NFTValidator = await NFTValidatorFactory.deploy(NFTContractAddress, merkleTree.getHexRoot());

    await NFTValidator.deployed();

    console.log(`Validator Contract deployed to: ${NFTValidator.address}`);
    if (!isTest) {
        exportContract("NFTPotionValidator", NFTValidator.address);
    }

    _restoreLogs();

    return { NFTValidator };
}

async function deployMockUSDC() {
    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    let MockUSDC = await MockUSDCFactory.deploy();

    await MockUSDC.deployed();

    return MockUSDC;
}

async function _getUSDC(isTest = false) {
    let USDC;

    if (isTest) {
        USDC = await deployMockUSDC();
        await USDC.deployed();
    } else {
        const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
        USDC = await MockUSDCFactory.attach(USDC_ADDRESS);
    }

    console.log(`USDC Contract at: ${USDC.address}`);

    return USDC;
}

async function deployPotionNFTGame(deployedUSDC = undefined, isTest = false) {
    // NFT contract
    const { NFTPotion, encryptedPassword } = await deployNFTContract(isTest);

    // NFT Dutch Auction
    const { NFTDutchAuction, USDC } = await deployDutchAuction(NFTPotion, deployedUSDC, isTest);

    // Validator contract
    const { NFTValidator } = await deployNFTValidator(NFTPotion.address, isTest);

    return { NFTPotion, NFTDutchAuction, NFTValidator, USDC, encryptedPassword };
}

module.exports = {
    deployNFTContract,
    deployDutchAuction,
    deployNFTValidator,
    deployPotionNFTGame,
    deployMockUSDC,
};

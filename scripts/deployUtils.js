const { ethers, network } = require("hardhat");

require("dotenv").config();

const {
    decryptPassword,
    buildMerkleTree,
    getPotionGenesis,
    exportContract,
    getRaritiesConfig,
    encodeRarityConfig,
} = require("./lib/utils");
const { NFT_NAME, NFT_SYMBOL, USDC_ADDRESSES } = require("./config");

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

async function deployNFTContract(deployedUSDC = undefined, isTest = false) {
    _configureLogs(isTest);

    // Rarities
    const raritiesConfig = getRaritiesConfig();
    const raritiesConfigSolidity = encodeRarityConfig(raritiesConfig);

    // Genesis
    const potionGenesis = getPotionGenesis();

    // Validate source code password
    const encryptedPassword = Buffer.from(process.env.ENCRYPTED_PASSWORD, "hex");
    const decryptedPasswordGenesis = decryptPassword(process.env.ENCRYPTED_PASSWORD);
    const configPasswordGenesis = Buffer.from(process.env.PASSWORD_GENESIS, "hex");

    if (decryptedPasswordGenesis === null || Buffer.compare(decryptedPasswordGenesis, configPasswordGenesis) !== 0) {
        throw new Error(`Encrypted Password does not decrypt into Password Genesis using Potion Genesis!`);
    }

    if (encryptedPassword.length !== potionGenesis.length) {
        throw new Error(
            `Encrypted Password length (${configPasswordGenesis.length}) is different from Potion Genesis length (${potionGenesis.length})`,
        );
    }

    // Merkle tree
    const { merkleTree } = buildMerkleTree(potionGenesis, raritiesConfig);

    // USDC
    //
    // Value can be passed as a parameter. If it is not passed then
    // fetch it internally (which will in turn deploy it or use the
    // mainnet one
    let USDC = deployedUSDC;
    if (USDC === undefined) {
        USDC = await _getUSDC(isTest);
    }

    console.log("[NFTPotion]");

    // Deploy the contract
    const NFTPotionFactory = await ethers.getContractFactory("NFTPotion");
    let NFTPotion = await NFTPotionFactory.deploy(
        NFT_NAME,
        NFT_SYMBOL,
        process.env.IPFS_PREFIX,
        process.env.IPFS_SUFFIX,
        encryptedPassword,
        USDC.address,
        raritiesConfigSolidity,
    );

    await NFTPotion.deployed();

    console.log("  - Potion NFT Contract deployed to:", NFTPotion.address);
    if (!isTest) {
        exportContract("NFTPotion", NFTPotion.address);
    }

    _restoreLogs();

    return { NFTPotion, USDC, encryptedPassword, merkleTree };
}

async function deployNFTValidator(NFTContractAddress, isTest = false) {
    _configureLogs(isTest);

    console.log("[NFTValidator]");

    // Rarities
    const raritiesConfig = getRaritiesConfig();

    // Genesis
    const potionGenesis = getPotionGenesis();

    // Merkle tree
    const { merkleTree } = buildMerkleTree(potionGenesis, raritiesConfig);

    // Deploy contract
    const NFTValidatorFactory = await ethers.getContractFactory("NFTPotionValidator");
    let NFTPotionValidator = await NFTValidatorFactory.deploy(NFTContractAddress, merkleTree.getHexRoot());

    await NFTPotionValidator.deployed();

    console.log(`  - Validator Contract deployed to: ${NFTPotionValidator.address}`);
    if (!isTest) {
        exportContract("NFTPotionValidator", NFTPotionValidator.address);
    }

    _restoreLogs();

    return NFTPotionValidator;
}

async function deployMockUSDC() {
    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    let MockUSDC = await MockUSDCFactory.deploy();

    await MockUSDC.deployed();

    return MockUSDC;
}

async function _getUSDC(isTest = false) {
    let USDC;

    const USDC_ADDRESS = USDC_ADDRESSES[network.name];

    if (network.name === "mainnet" && USDC_ADDRESS === undefined) {
        throw new Error("USDC address is not defined for mainnet!!!");
    }

    console.log("[USDC]");

    if (isTest || USDC_ADDRESS === undefined) {
        console.log("  - Deploying mock USDC");

        USDC = await deployMockUSDC();
        await USDC.deployed();
    } else {
        const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
        USDC = await MockUSDCFactory.attach(USDC_ADDRESS);
    }

    if (!isTest && network.name === "localhost") {
        console.log(`  - Minting some USDC for the first 10 accounts`);

        const signers = await ethers.getSigners();
        for (let i = 0; i < 10; i++) {
            await USDC.mint(signers[i].address, ethers.utils.parseEther("1000000000"));
        }
    }

    console.log(`  - USDC Contract at: ${USDC.address}`);

    return USDC;
}

async function deployPotionNFTGame(deployedUSDC = undefined, isTest = false) {
    // NFT contract
    const { NFTPotion, USDC, encryptedPassword, merkleTree } = await deployNFTContract(deployedUSDC, isTest);

    // Validator contract
    const NFTValidator = await deployNFTValidator(NFTPotion.address, isTest);

    if (!isTest) {
        console.log(`\nMerkle Tree root: ${merkleTree.getHexRoot()}\n\n`);
    }

    return { NFTPotion, NFTValidator, USDC, encryptedPassword };
}

module.exports = { deployNFTContract, deployNFTValidator, deployPotionNFTGame, deployMockUSDC };

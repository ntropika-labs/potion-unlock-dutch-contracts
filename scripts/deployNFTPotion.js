const hre = require("hardhat");

require("dotenv").config();

const { encryptPassword, buildMerkleTree, getPotionGenesis, exportContract } = require("./utils");
const { NFT_NAME, NFT_SYMBOL, NUM_NFTS, SOURCE_CODE_PASSWORD, IPFS_PREFIX, IPFS_SUFFIX } = require("./config");

async function deployAuction(hre, biddingTokenAddress) {
    const NFTAuctionFactory = await hre.ethers.getContractFactory("NFTPotionAuction");
    let NFTAuction = await NFTAuctionFactory.deploy(biddingTokenAddress);

    await NFTAuction.deployed();

    console.log(`Auction Contract deployed to: ${NFTAuction.address}`);
    exportContract("NFTPotionAuction", NFTAuction.address);

    return NFTAuction;
}

async function deployWETH(hre) {
    const WETHFactory = await hre.ethers.getContractFactory("MockWETH");
    let MockWETH = await WETHFactory.deploy([
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    ]);

    await MockWETH.deployed();

    console.log(`MockWETH Contract deployed to: ${MockWETH.address}`);
    exportContract("MockWETH", MockWETH.address);

    return MockWETH;
}

async function deployNFTContract(hre, NFTAuctionContract, secret) {
    const NFTPotionFactory = await hre.ethers.getContractFactory("NFTPotion");
    let NFTPotion = await NFTPotionFactory.deploy(
        NFT_NAME,
        NFT_SYMBOL,
        IPFS_PREFIX,
        IPFS_SUFFIX,
        NUM_NFTS,
        secret,
        NFTAuctionContract.address,
    );

    await NFTPotion.deployed();

    console.log("Potion NFT Contract deployed to:", NFTPotion.address);
    exportContract("NFTPotion", NFTPotion.address);

    return NFTPotion;
}

async function deployNFTValidator(hre, NFTContractAddress, merkleTree, partialSecretSize) {
    const merkleRoot = merkleTree.getHexRoot();

    const NFTValidatorFactory = await hre.ethers.getContractFactory("NFTPotionValidator");
    let NFTValidator = await NFTValidatorFactory.deploy(NFTContractAddress, merkleRoot, NUM_NFTS, partialSecretSize);

    await NFTValidator.deployed();

    console.log(`Validator Contract deployed to: ${NFTValidator.address}`);
    exportContract("NFTPotionValidator", NFTValidator.address);

    return NFTValidator;
}

async function main() {
    // Genesis
    const potionGenesis = getPotionGenesis();
    if (potionGenesis.length % NUM_NFTS !== 0) {
        console.log(
            `Potion Genesis length (${potionGenesis.length} bytes) is not divisible by number of NFTs (${NUM_NFTS})`,
        );
        return;
    }

    // Source code password
    const encryptedPassword = encryptPassword(SOURCE_CODE_PASSWORD);
    const encryptedPasswordLength = Buffer.from(encryptedPassword.slice(2), "hex").length;

    if (encryptedPasswordLength !== potionGenesis.length) {
        console.log(
            `Encrypted source code password length (${encryptedPasswordLength}) is different from Potion Genesis length (${potionGenesis.length})`,
        );
        return;
    }

    console.log(`\nEncrypted Password: ${encryptedPassword}\n\n`);

    // Merkle tree
    const merkleTree = buildMerkleTree(potionGenesis, NUM_NFTS);
    const partialSecretSize = potionGenesis.length / NUM_NFTS;

    console.log(`Merkle Tree root: ${merkleTree.getHexRoot()}\n\n`);

    // Auction contract
    const mockWETH = await deployWETH(hre);
    const NFTAuction = await deployAuction(hre, mockWETH.address);

    // NFT contract
    const NFTPotion = await deployNFTContract(hre, NFTAuction, encryptedPassword);

    // Validator contract
    await deployNFTValidator(hre, NFTPotion.address, merkleTree, partialSecretSize);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

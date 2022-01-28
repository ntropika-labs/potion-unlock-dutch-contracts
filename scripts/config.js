// Config
const NFT_NAME = "Potion Unlock";
const NFT_SYMBOL = "PUNFT";
const NUM_NFTS = 10000;

const USDC_ADDRESSES = {
    mainnet: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    rinkeby: "0xeb8f08a975ab53e34d8a0330e0d34de942c95926",
};

const RARITIES_CONFIG = [
    {
        startTokenId: 1,
        endTokenId: 1478,
        secretSegmentStart: 0,
        secretSegmentLength: 2217,
        bytesPerPiece: 3,
        rarityId: 0,
        rarityName: "Wise Wizard",
        rarityBG: "wise_wizard.png",
    },
    {
        startTokenId: 1479,
        endTokenId: 2000,
        secretSegmentStart: 2217,
        secretSegmentLength: 522,
        bytesPerPiece: 2,
        rarityId: 1,
        rarityName: "Kelly Knight",
        rarityBG: "kelly_knights.png",
    },
    {
        startTokenId: 2001,
        endTokenId: 4850,
        secretSegmentStart: 2739,
        secretSegmentLength: 200,
        bytesPerPiece: 4,
        rarityId: 2,
        rarityName: "OG",
        rarityBG: "og.png",
    },
    {
        startTokenId: 4851,
        endTokenId: 7450,
        secretSegmentStart: 2939,
        secretSegmentLength: 520,
        bytesPerPiece: 10,
        rarityId: 3,
        rarityName: "Fellow",
        rarityBG: "fellow.png",
    },
    {
        startTokenId: 7451,
        endTokenId: 9250,
        secretSegmentStart: 3459,
        secretSegmentLength: 900,
        bytesPerPiece: 10,
        rarityId: 4,
        rarityName: "Advanced",
        rarityBG: "advanced.png",
    },
    {
        startTokenId: 9251,
        endTokenId: 10000,
        secretSegmentStart: 4359,
        secretSegmentLength: 1125,
        bytesPerPiece: 15,
        rarityId: 5,
        rarityName: "Legendary",
        rarityBG: "legendary.png",
    },
];

// Contracts deployment
const CONTRACTS_DEPLOYMENTS_FILE = "src/deployments.json";

module.exports = {
    NFT_NAME,
    NFT_SYMBOL,
    NUM_NFTS,
    USDC_ADDRESSES,
    CONTRACTS_DEPLOYMENTS_FILE,
    RARITIES_CONFIG,
};

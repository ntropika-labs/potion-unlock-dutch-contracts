// Config
const NFT_NAME = "Potion Unlock";
const NFT_SYMBOL = "PUNFT";
const NUM_NFTS = 10000;

const USDC_ADDRESSES = {
    mainnet: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    rinkeby: "0x4dbcdf9b62e891a7cec5a2568c3f4faf9e8abe2b",
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
        rarityFrame: "wise-wizard-frame",
    },
    {
        startTokenId: 1479,
        endTokenId: 2000,
        secretSegmentStart: 2217,
        secretSegmentLength: 522,
        bytesPerPiece: 2,
        rarityId: 1,
        rarityName: "Kelly Knights",
        rarityFrame: "kelly-knight-frame",
    },
    {
        startTokenId: 2001,
        endTokenId: 2350,
        secretSegmentStart: 2739,
        secretSegmentLength: 210,
        bytesPerPiece: 30,
        rarityId: 2,
        rarityName: "OG",
        rarityFrame: "ogs-frame",
    },
    {
        startTokenId: 2351,
        endTokenId: 7450,
        secretSegmentStart: 2949,
        secretSegmentLength: 510,
        bytesPerPiece: 10,
        rarityId: 3,
        rarityName: "Fellowship",
        rarityFrame: "fellowship-frame",
    },
    {
        startTokenId: 7451,
        endTokenId: 9250,
        secretSegmentStart: 3459,
        secretSegmentLength: 900,
        bytesPerPiece: 10,
        rarityId: 4,
        rarityName: "Advanced",
        rarityFrame: "advanced-frame",
    },
    {
        startTokenId: 9251,
        endTokenId: 10000,
        secretSegmentStart: 4359,
        secretSegmentLength: 1125,
        bytesPerPiece: 15,
        rarityId: 5,
        rarityName: "Legendary",
        rarityFrame: "legendary-frame",
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

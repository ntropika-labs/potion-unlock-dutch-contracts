// Config
const NFT_NAME = "Potion NFT Game 1";
const NFT_SYMBOL = "PNFT1";

const METAMASK_PUBLIC_KEY = "mtrHp1WHZM9rxF2Ilot9Hie5XmQcKCf7oDQ1DpGkTSI=";
const CONTRACTS_DEPLOYMENTS_FILE = "src/deployments.json";

// Demo Config
const NUM_NFTS = 10000;
const IPFS_PREFIX = "http://ipfs.io/ipfs/QmP64ezSShtSsYXXAgL5ju9Zzvr9AzEZnxiiVw6Ynd6Skt/";
const IPFS_SUFFIX = ".json";

const RARITIES_CONFIG = [
    {
        // Seed Round (1450 tokens)
        startTokenId: 1,
        endTokenId: 1450,
        secretSegmentStart: 0,
        secretSegmentLength: 2175,
        bytesPerPiece: 3,
    },
    {
        // Private Auction (600 tokens)
        startTokenId: 1451,
        endTokenId: 2050,
        secretSegmentStart: 2175,
        secretSegmentLength: 600,
        bytesPerPiece: 2,
    },
    {
        // Legendary (750 tokens)
        startTokenId: 2051,
        endTokenId: 2800,
        secretSegmentStart: 2775,
        secretSegmentLength: 1125,
        bytesPerPiece: 15,
    },
    {
        // High (1800 tokens)
        startTokenId: 2801,
        endTokenId: 4600,
        secretSegmentStart: 3900,
        secretSegmentLength: 900,
        bytesPerPiece: 10,
    },
    {
        // Base (5100 tokens)
        startTokenId: 4601,
        endTokenId: 9700,
        secretSegmentStart: 4800,
        secretSegmentLength: 510,
        bytesPerPiece: 10,
    },
    {
        // Airdrop (300 tokens)
        startTokenId: 9701,
        endTokenId: 10000,
        secretSegmentStart: 5310,
        secretSegmentLength: 240,
        bytesPerPiece: 40,
    },
];

module.exports = {
    NFT_NAME,
    NFT_SYMBOL,
    NUM_NFTS,
    METAMASK_PUBLIC_KEY,
    CONTRACTS_DEPLOYMENTS_FILE,
    IPFS_PREFIX,
    IPFS_SUFFIX,
    RARITIES_CONFIG,
};

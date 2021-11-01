const fs = require("fs");
const { decodeUTF8, encodeUTF8, decodeBase64, encodeBase64 } = require("tweetnacl-util");
const { bufferToHex } = require("ethereumjs-util");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

const { METAMASK_PUBLIC_KEY, CONTRACTS_DEPLOYMENTS_FILE, RARITIES_CONFIG, NUM_NFTS } = require("../config");
const { encrypt, decrypt, getPublicKey, getPrivateKey } = require("./nacl");
const { encrypt: encryptMetamask } = require("@metamask/eth-sig-util");

require("dotenv").config();

/**
 * Potion key management
 */
function getPotionGenesis() {
    return Buffer.from(process.env.POTION_GENESIS, "hex");
}

function getPotionSecretKey() {
    return keccak256(keccak256(keccak256(getPotionGenesis())));
}

function encryptPassword(password) {
    const encryptedMessage = signPotionMessage(password);
    return bufferToHex(decodeBase64(encryptedMessage));
}

function decryptPassword(encryptedPassword, privateKey) {
    const encryptedData = Buffer.from(encryptedPassword.slice(2), "hex");
    const key = Buffer.from(privateKey.slice(2), "hex");

    const encryptedMessage = encodeBase64(encryptedData);

    const decryptedData = decrypt(encryptedMessage, key);
    return encodeUTF8(decryptedData);
}

/**
 * Potion public/private key utils
 */
function getPotionPrivateKey() {
    return getPrivateKey(getPotionSecretKey());
}

function getPotionPublicKey() {
    return getPublicKey(getPotionSecretKey());
}

function signPotionMessage(message) {
    const potionPublicKey = getPotionPublicKey();
    const messageUintArray = decodeUTF8(message);
    const encryptedData = encrypt(potionPublicKey, messageUintArray);
    return encryptedData;
}

function decryptPotionMessage(encryptedMessage) {
    const potionPrivateKey = getPotionPrivateKey();
    const decryptedData = decrypt(encryptedMessage, potionPrivateKey);
    return encodeUTF8(decryptedData);
}

/**
 * Metamask Encryption
 */
function getMetamaskPublicKey() {
    return METAMASK_PUBLIC_KEY;
}

function signMetamaskMessage(publicKey, data) {
    const message = bufferToHex(data);
    const encryptedData = encryptMetamask({ publicKey, data: message, version: "x25519-xsalsa20-poly1305" });
    const encryptedString = JSON.stringify(encryptedData);
    const encryptedBuffer = Buffer.from(encryptedString, "utf8");
    return bufferToHex(encryptedBuffer);
}

function encryptSecret(secret) {
    let encryptedSecret = "";

    for (let i = 0; i < secret.length; ++i) {
        const encryptedChar = String.fromCharCode(secret.charCodeAt(i) + 1);
        encryptedSecret += encryptedChar;
    }

    return encryptedSecret;
}

/**
 * Merkle Tree
 */
 function getPieceHash(piece, tokenId, encrypted = true) {
    const tokenIdData = Buffer.from(String.fromCharCode(tokenId));
    const padding = Buffer.from("00000000000000000000000000000000000000000000000000000000000000", "hex");
    const data = Buffer.concat([padding, tokenIdData, piece]);

    if (encrypted) {
        return keccak256(data);
    } else {
        return data;
    }
}

function getMerkleLeaves(secret, rarityConfig, encrypted = true) {
    let leaves = [];

    for (let i = 0; i < NUM_NFTS; ++i) {
        const tokenID = i + 1;
        const secretPiece = getSecretPieceFromId(tokenID, secret, rarityConfig);
        leaves.push(getPieceHash(secretPiece, tokenID, encrypted));
    }

    return leaves;
}

function buildMerkleTree(secret, rarityConfig) {
    let leaves = getMerkleLeaves(secret, rarityConfig);

    const merkleTree = new MerkleTree(leaves, keccak256, { sort: true });
    return merkleTree;
}

/**
 * Misc
 */
function exportContract(name, address, append = true) {
    let deployments = {};

    if (append) {
        try {
            const deploymentsStr = fs.readFileSync(CONTRACTS_DEPLOYMENTS_FILE);
            deployments = JSON.parse(deploymentsStr);
        } catch {}
    }

    deployments[name] = address;

    fs.writeFileSync(CONTRACTS_DEPLOYMENTS_FILE, JSON.stringify(deployments));
}

/**
 * Rarities
 */
function getSecretPieceFromId(tokenId, secret, raritiesConfig, batchFragments=false)
{
    for (let i=0; i<raritiesConfig.length; ++i) {
        const config = raritiesConfig[i];
        if (tokenId < config.startTokenId || tokenId>config.endTokenId) {
            continue;
        }

        const numTokens = config.endTokenId - config.startTokenId + 1;
        const fragment = secret.subarray(config.secretSegmentStart, config.secretSegmentStart + config.secretSegmentLength);
        const fragmentNumPieces = fragment.length / config.bytesPerPiece;
        const tokensPerPiece = numTokens/fragmentNumPieces;

        const pieceIndex = batchFragments ? Math.floor((tokenId - config.startTokenId)/tokensPerPiece) : 
                                            (tokenId - config.startTokenId) % fragmentNumPieces;
        return fragment.subarray(pieceIndex * config.bytesPerPiece, (pieceIndex+1) * config.bytesPerPiece);
    }

    throw Error("Invalid token ID for rarity config when calculated secret fragment");
}

function getRaritiesConfig() {
    let totalNFTs = 0;
    let totalSecretLength = 0;

    RARITIES_CONFIG.forEach(rarityConfig => {
        if (rarityConfig.secretSegmentLength % rarityConfig.bytesPerPiece !== 0) {
            throw Error(
                `Error in rarity config, segment length (${rarityConfig.secretSegmentLength}) is not divisible by bytes per piece (${rarityConfig.bytesPerPiece})`,
            );
        }

        totalNFTs += rarityConfig.endTokenId - rarityConfig.startTokenId + 1;
        totalSecretLength += rarityConfig.secretSegmentLength;
    });

    if (totalNFTs !== NUM_NFTS) {
        throw Error(
            `Number of NFTs defined in rarity config (${totalNFTs}) is different from maximum number of NFTs in contract (${NUM_NFTS}) `,
        );
    }

    const genesisLength = getPotionGenesis().length;

    if (totalSecretLength !== genesisLength) {
        throw Error(
            `Secret length defined in rarity config (${totalSecretLength}) is different from Genesis length (${genesisLength}) `,
        );
    }

    return RARITIES_CONFIG;
}

module.exports = {
    getPotionGenesis,
    getPotionSecretKey,
    getPotionPublicKey,
    getPotionPrivateKey,
    signPotionMessage,
    decryptPotionMessage,
    signMetamaskMessage,
    encryptSecret,
    buildMerkleTree,
    getDataFromSecret: getPieceHash,
    getMerkleLeaves,
    getMetamaskPublicKey,
    encryptPassword,
    decryptPassword,
    exportContract,
    getRaritiesConfig,
    getSecretPieceFromId
};

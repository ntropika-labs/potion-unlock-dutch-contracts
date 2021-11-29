const fs = require("fs");
const { decodeUTF8, encodeUTF8, decodeBase64, encodeBase64 } = require("tweetnacl-util");
const { bufferToHex } = require("ethereumjs-util");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const { BigNumber } = require("@ethersproject/bignumber");
const { METAMASK_PUBLIC_KEY, CONTRACTS_DEPLOYMENTS_FILE, RARITIES_CONFIG, NUM_NFTS } = require("../config");
const { encrypt, decrypt, encryptSymmetric, decryptSymmetric, getPublicKey, getPrivateKey } = require("./nacl");
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

/**
 * Asymmetric key functions
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
 * Symmetric key functions
 */
function encryptDataSymmetric(data) {
    return encryptSymmetric(getPotionSecretKey(), data);
}

function decryptDataSymmetric(encryptedData, key=undefined) {
    let keyBuffer;
    if (key) {
        keyBuffer = keccak256(keccak256(keccak256(Buffer.from(key.slice(2), "hex"))));
    } else {
        keyBuffer = getPotionSecretKey();
    }
    return decryptSymmetric(keyBuffer, encryptedData);
}

/**
 * Password encryption functions
 */

function encryptPassword(password) {
    const passwordBuffer = Buffer.from(password, "hex");
    return bufferToHex(encryptDataSymmetric(passwordBuffer));
}

function decryptPassword(encryptedPassword, key=undefined) {
    const encryptedData = Buffer.from(encryptedPassword.slice(2), "hex");
    return decryptDataSymmetric(encryptedData, key);
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

/**
 * Merkle Tree
 */
 function getPieceHash(piece, tokenId, encrypted = true) {
    let tempArray = new ArrayBuffer(4);
    new DataView(tempArray).setUint32(0, tokenId);
    const tokenIdData = Buffer.from(new Uint8Array(tempArray));

    const padding = Buffer.from("00000000000000000000000000000000000000000000000000000000", "hex");
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

function getSecretStartAndLength(tokenId, raritiesConfig)
{
    for (let i = 0; i < raritiesConfig.length; ++i) {
        const config = raritiesConfig[i];

        if (tokenId >= config.startTokenId && tokenId <= config.endTokenId) {
            let fragmentNumPieces = config.secretSegmentLength / config.bytesPerPiece;
            let pieceIndex = (tokenId - config.startTokenId) % fragmentNumPieces;

            return { start:config.secretSegmentStart + pieceIndex * config.bytesPerPiece, length: config.bytesPerPiece };
        }
    }

    return { start: 0, length: 0 };
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
    //console.log(JSON.stringify(RARITIES_CONFIG));
    return RARITIES_CONFIG;
}

function encodeRarityConfig(rarityConfig) {
    return rarityConfig.map(item => {
        return {
            startTokenId: BigNumber.from(item.startTokenId),
            endTokenId: BigNumber.from(item.endTokenId),
            secretSegmentStart: BigNumber.from(item.secretSegmentStart),
            secretSegmentLength: BigNumber.from(item.secretSegmentLength),
            bytesPerPiece: BigNumber.from(item.bytesPerPiece),
        };
    });
}

module.exports = {
    // Key management
    getPotionGenesis,
    getPotionSecretKey,
    getPotionPublicKey,
    getPotionPrivateKey,
    // Asymmetric key encryption
    signPotionMessage,
    decryptPotionMessage,
    // Symmentric key encryption
    encryptDataSymmetric,
    decryptDataSymmetric,
    // Password encryption
    encryptPassword,
    decryptPassword,
    // Metamask encryption
    signMetamaskMessage,
    getMetamaskPublicKey,
    // Merkle Tree
    buildMerkleTree,
    getPieceHash,
    getMerkleLeaves,
    // Rarities
    getRaritiesConfig,
    encodeRarityConfig,
    getSecretPieceFromId,
    getSecretStartAndLength,
    // Misc
    exportContract,
};

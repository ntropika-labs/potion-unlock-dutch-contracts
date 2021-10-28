const fs = require("fs");
const { decodeUTF8, encodeUTF8, decodeBase64, encodeBase64 } = require("tweetnacl-util");
const { bufferToHex } = require("ethereumjs-util");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

const { METAMASK_PUBLIC_KEY, CONTRACTS_DEPLOYMENTS_FILE } = require("./config");
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

function getDataFromSecret(secret, tokenId, encrypted = true) {
    const tokenIdData = Buffer.from(String.fromCharCode(tokenId));
    const padding = Buffer.from("00000000000000000000000000000000000000000000000000000000000000", "hex");
    const data = Buffer.concat([padding, tokenIdData, secret]);

    if (encrypted) {
        return keccak256(data);
    } else {
        return data;
    }
}

/**
 * Merkle Tree
 */
function getMerkleLeaves(secret, numNFTs, encrypted = true) {
    let leaves = [];

    const partialSecretLength = secret.length / numNFTs;

    for (let i = 0; i < numNFTs; ++i) {
        const partialSecret = secret.subarray(i * partialSecretLength, (i + 1) * partialSecretLength);
        const tokenID = i + 1;
        leaves.push(getDataFromSecret(partialSecret, tokenID, encrypted));
    }

    return leaves;
}

function buildMerkleTree(secret, numNFTs) {
    let leaves = getMerkleLeaves(secret, numNFTs);

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
    getDataFromSecret,
    getMerkleLeaves,
    getMetamaskPublicKey,
    encryptPassword,
    decryptPassword,
    exportContract,
};

const fs = require("fs");
const { ethers } = require("hardhat");
const { bufferToHex } = require("ethereumjs-util");
const { decodeUTF8 } = require("tweetnacl-util");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

const { METAMASK_PUBLIC_KEY, CONTRACTS_DEPLOYMENTS_FILE } = require("./config");
const { encrypt } = require("./nacl");

require("dotenv").config();

const POTION_PRIVATE_KEY = process.env.POTION_PRIVATE_KEY;

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

function encryptPassword(password) {
    const publicKey = getPublicKey();
    const message = decodeUTF8(password);
    const encryptedData = encrypt(publicKey, message);
    const encryptedString = JSON.stringify(encryptedData);
    const encryptedBuffer = Buffer.from(encryptedString, "utf8");

    return encryptedBuffer;
}

function getPublicKey() {
    const wallet = new ethers.Wallet(POTION_PRIVATE_KEY);
    return keccak256(wallet.publicKey);
}

function getPrivateKey() {
    const wallet = new ethers.Wallet(POTION_PRIVATE_KEY);
    return wallet.privateKey;
}

function getMetamaskPublicKey() {
    return METAMASK_PUBLIC_KEY;
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
    let data =
        "0x00000000000000000000000000000000000000000000000000000000000000" +
        Number(tokenId).toString(16) +
        Number(secret.charCodeAt(tokenId - 1)).toString(16);

    if (encrypted) {
        return keccak256(data);
    } else {
        return data;
    }
}

function getMerkleLeaves(secret, encrypted = true) {
    let leaves = [];

    for (let i = 1; i <= secret.length; ++i) {
        leaves.push(getDataFromSecret(secret, i, encrypted));
    }

    return leaves;
}

function buildMerkleTree(secret) {
    let leaves = getMerkleLeaves(secret);

    const merkleTree = new MerkleTree(leaves, keccak256, { sort: true });
    return merkleTree;
}

module.exports = {
    getPublicKey,
    getPrivateKey,
    encryptSecret,
    buildMerkleTree,
    getDataFromSecret,
    getMerkleLeaves,
    getMetamaskPublicKey,
    encryptPassword,
    exportContract,
};

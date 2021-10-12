const { ethers } = require("hardhat");
const { toBuffer } = require("ethereumjs-util");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const { METAMASK_PUBLIC_KEY } = require("./config");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;

function getPublicKey() {
    const wallet = new ethers.Wallet(PRIVATE_KEY);
    const publicKeyECDSA = wallet.publicKey;
    console.log(publicKeyECDSA);
    const publicKeyBufferECDSA = toBuffer(publicKeyECDSA);

    return publicKeyBufferECDSA.slice(1);
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
    encryptSecret,
    buildMerkleTree,
    getDataFromSecret,
    getMerkleLeaves,
    getMetamaskPublicKey,
};

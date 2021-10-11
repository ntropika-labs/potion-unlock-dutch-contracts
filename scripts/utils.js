const { ethers } = require("hardhat");
const { toBuffer } = require("ethereumjs-util");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;

function getPublicKey() {
    const wallet = new ethers.Wallet(PRIVATE_KEY);
    const publicKeyECDSA = wallet.publicKey;
    console.log(publicKeyECDSA);
    const publicKeyBufferECDSA = toBuffer(publicKeyECDSA);

    return publicKeyBufferECDSA.slice(1);
}

function encryptSecret(secret) {
    let encryptedSecret = "";

    secret.split("").forEach(character => (encryptedSecret += character));

    return encryptedSecret;
}

function getDataFromSecret(secret, tokenId) {
    return (
        "0x00000000000000000000000000000000000000000000000000000000000000" +
        Number(tokenId).toString(16) +
        Number(secret.charCodeAt(tokenId - 1)).toString(16)
    );
}

function getSecretLeaves(secret) {
    let leaves = [];

    for (let i = 1; i <= secret.length; ++i) {
        leaves.push(getDataFromSecret(secret, i));
    }

    return leaves;
}

function buildMerkleTree(secret) {
    let leaves = getSecretLeaves(secret);

    const merkleTree = new MerkleTree(leaves, keccak256, { hashLeaves: true, sort: true });
    return merkleTree;
}

module.exports = {
    getPublicKey,
    encryptSecret,
    buildMerkleTree,
    getDataFromSecret,
    getSecretLeaves,
};

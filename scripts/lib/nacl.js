const nacl = require("tweetnacl");
const naclUtil = require("tweetnacl-util");
function isNullish(value) {
    return value === null || value === undefined;
}

function getKeyPair(secret) {
    return nacl.box.keyPair.fromSecretKey(secret);
}

function getPublicKey(secret) {
    return getKeyPair(secret).publicKey;
}

function getPrivateKey(secret) {
    return getKeyPair(secret).secretKey;
}

function encrypt(publicKey, data) {
    if (isNullish(publicKey)) {
        throw new Error("Missing publicKey parameter");
    } else if (isNullish(data)) {
        throw new Error("Missing data parameter");
    }

    // generate ephemeral keypair
    const ephemeralKeyPair = nacl.box.keyPair();
    const nonce = nacl.randomBytes(nacl.box.nonceLength);

    // encrypt
    const encryptedMessage = nacl.box(data, nonce, publicKey, ephemeralKeyPair.secretKey);

    const noncePublicEncrypted = new Uint8Array(nonce.length + publicKey.length + encryptedMessage.length);
    noncePublicEncrypted.set(nonce, 0);
    noncePublicEncrypted.set(ephemeralKeyPair.publicKey, nonce.length);
    noncePublicEncrypted.set(encryptedMessage, nonce.length + ephemeralKeyPair.publicKey.length);

    return naclUtil.encodeBase64(noncePublicEncrypted);
}

function decrypt(encryptedData, privateKey) {
    if (isNullish(encryptedData)) {
        throw new Error("Missing encryptedData parameter");
    } else if (isNullish(privateKey)) {
        throw new Error("Missing privateKey parameter");
    }

    // assemble decryption parameters
    const encryptedMessage = naclUtil.decodeBase64(encryptedData);
    const nonce = encryptedMessage.subarray(0, nacl.box.nonceLength);
    const publicKey = encryptedMessage.subarray(nacl.box.nonceLength, nacl.box.nonceLength + nacl.box.publicKeyLength);
    const ciphertext = encryptedMessage.subarray(nacl.box.nonceLength + nacl.box.publicKeyLength);

    // decrypt
    return nacl.box.open(ciphertext, nonce, publicKey, privateKey);
}

function encryptSymmetric(symmetricKey, data) {
    if (isNullish(symmetricKey)) {
        throw new Error("Missing symmetricKey parameter");
    } else if (isNullish(data)) {
        throw new Error("Missing data parameter");
    }

    // generate ephemeral keypair
    const nonce = nacl.randomBytes(nacl.box.nonceLength);

    // encrypt
    const encryptedMessage = nacl.secretbox(data, nonce, symmetricKey);

    const noncePublicEncrypted = new Uint8Array(nonce.length + encryptedMessage.length);
    noncePublicEncrypted.set(nonce, 0);
    noncePublicEncrypted.set(encryptedMessage, nonce.length);

    return noncePublicEncrypted;
}

function decryptSymmetric(symmetricKey, encryptedData) {
    if (isNullish(encryptedData)) {
        throw new Error("Missing encryptedData parameter");
    } else if (isNullish(symmetricKey)) {
        throw new Error("Missing symmetricKey parameter");
    }

    // assemble decryption parameters
    const nonce = encryptedData.subarray(0, nacl.box.nonceLength);
    const ciphertext = encryptedData.subarray(nacl.box.nonceLength);

    // decrypt
    return nacl.secretbox.open(ciphertext, nonce, symmetricKey);
}

function randomBytes(length) {
    return nacl.randomBytes(length);
}

module.exports = {
    encrypt,
    decrypt,
    encryptSymmetric,
    decryptSymmetric,
    getPublicKey,
    getPrivateKey,
    randomBytes,
};

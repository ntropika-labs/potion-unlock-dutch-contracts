const nacl = require("tweetnacl");
const naclUtil = require("tweetnacl-util");

function isNullish(value) {
    return value === null || value === undefined;
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

    return naclUtil.encodeBase64(encryptedMessage);
}

function decrypt(encryptedData, privateKey) {
    if (isNullish(encryptedData)) {
        throw new Error("Missing encryptedData parameter");
    } else if (isNullish(privateKey)) {
        throw new Error("Missing privateKey parameter");
    }

    // string to buffer to UInt8Array
    const privateKeyBase64 = Buffer.from(privateKey, "hex").toString("base64");
    const recieverPrivateKeyUint8Array = naclUtil.decodeBase64(privateKeyBase64);
    const recieverEncryptionPrivateKey = nacl.box.keyPair.fromSecretKey(recieverPrivateKeyUint8Array).secretKey;

    // assemble decryption parameters
    const nonce = naclUtil.decodeBase64(encryptedData.nonce);
    const ciphertext = naclUtil.decodeBase64(encryptedData.ciphertext);
    const ephemPublicKey = naclUtil.decodeBase64(encryptedData.ephemPublicKey);

    // decrypt
    const decryptedMessage = nacl.box.open(ciphertext, nonce, ephemPublicKey, recieverEncryptionPrivateKey);

    // return decrypted msg data
    let output;
    try {
        output = naclUtil.encodeUTF8(decryptedMessage);
    } catch (err) {
        throw new Error("Decryption failed.");
    }

    if (output) {
        return output;
    }
    throw new Error("Decryption failed.");
}

module.exports = {
    encrypt,
    decrypt,
};

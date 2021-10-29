const rsa = require("js-crypto-rsa");
const { encodeUTF8 } = require("tweetnacl-util");
const { bufferToHex } = require("ethereumjs-util");
const yargs = require("yargs");

async function main() {
    const argv = await yargs
        .option("message", {
            alias: "m",
            description: "Message to be encrypted",
            type: "string",
        })
        .option("keySize", {
            alias: "s",
            description: "Size of the RSA key",
            type: "number",
        })
        .demandOption(["message"])
        .default("keySize", 4096)
        .help()
        .alias("help", "h").argv;

    const key = await rsa.generateKey(argv.keySize);
    const message = Buffer.from(argv.message);

    const encrypted = await rsa.encrypt(message, key.publicKey, "SHA-256");
    console.log(bufferToHex(encrypted));

    const decrypted = await rsa.decrypt(encrypted, key.privateKey, "SHA-256");

    console.log(encodeUTF8(decrypted));
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

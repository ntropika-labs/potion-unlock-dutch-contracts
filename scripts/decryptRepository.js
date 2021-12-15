const { decryptDataSymmetric } = require("./lib/utils");
const { readFileSync, writeFileSync } = require("fs");

const yargs = require("yargs");

async function main() {
    const argv = await yargs
        .option("file", {
            alias: "f",
            description: "File to be decrypted",
            type: "string",
        })
        .option("genesis", {
            alias: "g",
            description: "File containing the Genesis in hex string format (eg 0ad56bc348cd)",
            type: "string",
        })
        .demandOption(["file", "genesis"])
        .help()
        .alias("help", "h").argv;

    // Read the input blob and extract the original filename and the encrypted file
    const blob = readFileSync(argv.file);
    const filenameLength = blob.readInt32LE(0);
    const filename = blob.slice(4, 4 + filenameLength).toString();
    const encryptedFile = blob.slice(4 + filenameLength);

    // Read the genesis file
    const genesis = readFileSync(argv.genesis).toString();

    // Decrypt the file
    const decryptedFile = decryptDataSymmetric(encryptedFile, genesis);
    if (decryptedFile === null) {
        console.log("Decryption failed: wrong genesis");
        process.exit(1);
    }

    writeFileSync(filename, decryptedFile);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

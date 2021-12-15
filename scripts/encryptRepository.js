const { encryptDataSymmetric } = require("./lib/utils");
const { readFileSync, writeFileSync } = require("fs");

const yargs = require("yargs");

async function main() {
    const argv = await yargs
        .option("file", {
            alias: "f",
            description: "File to be encrypted",
            type: "string",
        })
        .demandOption(["file"])
        .help()
        .alias("help", "h").argv;

    const data = readFileSync(argv.file);
    const encryptedFile = encryptDataSymmetric(data);
    const filenameNoExt = argv.file.split(".").slice(0, -1).join(".");

    // Create the header consisting of the length of the original filename
    // plus the original filename.
    const blob = Buffer.alloc(4 + argv.file.length + encryptedFile.length);
    blob.writeUInt32LE(argv.file.length, 0);
    Buffer.from(argv.file).copy(blob, 4);

    // Then insert the encrypted file
    Buffer.from(encryptedFile).copy(blob, 4 + argv.file.length);

    writeFileSync(filenameNoExt + ".crypto", blob);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

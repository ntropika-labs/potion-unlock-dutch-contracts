const { encryptDataSymmetric } = require("./lib/utils");
const { readFileSync, writeFileSync } = require("fs");
const path = require("path");

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

    const basename = path.basename(argv.file);
    const data = readFileSync(argv.file);
    const encryptedFile = encryptDataSymmetric(data);
    const filenameNoExt = basename.split(".").slice(0, -1).join(".");

    // Create the header consisting of the length of the original filename
    // plus the original filename.
    const blob = Buffer.alloc(4 + basename.length + encryptedFile.length);
    blob.writeUInt32LE(basename.length, 0);
    Buffer.from(basename).copy(blob, 4);

    // Then insert the encrypted file
    Buffer.from(encryptedFile).copy(blob, 4 + basename.length);

    writeFileSync(filenameNoExt + ".crypto", blob);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

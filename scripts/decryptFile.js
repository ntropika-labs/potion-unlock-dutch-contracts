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
        .option("output", {
            alias: "o",
            description: "Filename for output file",
            type: "string",
        })
        .demandOption(["file", "output"])
        .help()
        .alias("help", "h").argv;

    const data = readFileSync(argv.file);
    const decryptedFile = decryptDataSymmetric(data);
    writeFileSync(argv.output, decryptedFile);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

const { decryptPassword } = require("./lib/utils");
const { bufferToHex } = require("ethereumjs-util");
const yargs = require("yargs");

async function main() {
    const argv = await yargs
        .option("secret", {
            alias: "s",
            description: "Secret to be decrypted",
            type: "string",
        })
        .demandOption(["secret"])
        .help()
        .alias("help", "h").argv;

    const decryptedPassword = decryptPassword(argv.secret);
    console.log(bufferToHex(decryptedPassword));
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

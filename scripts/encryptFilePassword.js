const { encryptPassword } = require("./lib/utils");
const { bufferToHex } = require("ethereumjs-util");
const yargs = require("yargs");

async function main() {
    const argv = await yargs
        .option("secret", {
            alias: "s",
            description: "Secret to be encrypted",
            type: "string",
        })
        .demandOption(["secret"])
        .help()
        .alias("help", "h").argv;

    const encryptedPassword = encryptPassword(argv.secret);
    console.log(`\n\nEncrypted password: ${bufferToHex(encryptedPassword)}`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

const { decryptPassword } = require("./lib/utils");
const yargs = require("yargs");

async function main() {
    const argv = await yargs
        .option("secret", {
            alias: "s",
            description: "Secret to be decrypted",
            type: "string",
        })
        .option("privateKey", {
            alias: "k",
            description: "Private key for decryption",
            type: "string",
        })
        .demandOption(["secret", "privateKey"])
        .help()
        .alias("help", "h").argv;

    const decryptedPassword = decryptPassword(argv.secret, argv.privateKey);
    console.log(decryptedPassword);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

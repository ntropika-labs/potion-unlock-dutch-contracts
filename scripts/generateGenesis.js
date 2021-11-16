const { randomBytes } = require("./lib/nacl.js");
const { bufferToHex } = require("ethereumjs-util");
const { encryptPassword } = require("./lib/utils.js");

const yargs = require("yargs");

async function main() {
    const argv = await yargs
        .option("genesisSize", {
            alias: "s",
            description: "Size in bytes of the original genesis to be generated",
            type: "number",
        })
        .demandOption(["genesisSize"])
        .help()
        .alias("help", "h").argv;

    const originalGenesis = bufferToHex(randomBytes(argv.genesisSize));
    const passwordGenesis = bufferToHex(randomBytes((argv.genesisSize - 72) / 2));

    const encryptedPasswordGenesis = encryptPassword(passwordGenesis.substr(2));

    if (originalGenesis.length !== encryptedPasswordGenesis.length) {
        throw new Error("Cannot generate a proper password genesis for the given genesis size");
    }

    console.log(`POTION_GENESIS=${originalGenesis}`);
    console.log(`PASSWORD_GENESIS=${passwordGenesis}`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

const { randomBytes } = require("./lib/nacl.js");
const { bufferToHex } = require("ethereumjs-util");

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
    console.log(`POTION_GENESIS=${originalGenesis}`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

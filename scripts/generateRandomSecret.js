const { randomBytes } = require("./nacl.js");
const { bufferToHex } = require("ethereumjs-util");
const yargs = require("yargs");

async function main() {
    const argv = await yargs
        .option("secretSize", {
            alias: "s",
            description: "Size in bytes of the secret to be generated",
            type: "number",
        })
        .demandOption(["secretSize"])
        .help()
        .alias("help", "h").argv;

    const secret = bufferToHex(randomBytes(argv.secretSize));
    console.log(secret);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

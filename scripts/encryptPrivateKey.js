const { getPotionGenesis, signMetamaskMessage } = require("./utils");
const { NUM_NFTS } = require("./config");
const yargs = require("yargs");
const fs = require("fs");

async function main() {
    const argv = await yargs
        .option("keysFile", {
            alias: "f",
            description: "Public Keys",
            type: "string",
        })
        .option("keyIndex", {
            alias: "i",
            description: "Index of the key to process",
            type: "number",
        })
        .demandOption(["keysFile"])
        .help()
        .alias("help", "h").argv;

    const potionGenesis = getPotionGenesis();
    if (potionGenesis.length % NUM_NFTS !== 0) {
        console.log(
            `Potion Genesis length (${potionGenesis.length} bytes) is not divisible by number of NFTs (${NUM_NFTS})`,
        );
        return;
    }

    const publicKeysJSON = fs.readFileSync(argv.keysFile);
    const publicKeys = JSON.parse(publicKeysJSON);

    let secrets = [];
    const subkeyLength = potionGenesis.length / NUM_NFTS;
    for (let i = 0; i < publicKeys.length; ++i) {
        const encryptedSecret = signMetamaskMessage(
            publicKeys[i],
            potionGenesis.subarray(i * subkeyLength, (i + 1) * subkeyLength),
        );

        secrets.push(encryptedSecret);
    }

    if ("keyIndex" in argv && argv.keyIndex < secrets.length) {
        console.log(secrets[argv.keyIndex]);
    } else {
        console.log(secrets);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

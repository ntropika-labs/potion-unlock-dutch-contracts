const { getPotionGenesis, signMetamaskMessage, getSecretPieceFromId, getRaritiesConfig } = require("./lib/utils");
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
    const raritiesConfig = getRaritiesConfig();

    const publicKeysJSON = fs.readFileSync(argv.keysFile);
    const publicKeys = JSON.parse(publicKeysJSON);

    let secrets = [];
    for (let i = 0; i < publicKeys.length; ++i) {
        const secretPiece = getSecretPieceFromId(i + 1, potionGenesis, raritiesConfig);
        const encryptedSecret = signMetamaskMessage(publicKeys[i], secretPiece);

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

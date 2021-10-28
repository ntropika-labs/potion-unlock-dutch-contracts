const { getPotionPrivateKey, signMetamaskMessage } = require("./utils");
const yargs = require("yargs");
const fs = require("fs");

async function main() {
    const argv = await yargs
        .option("keysFile", {
            alias: "f",
            description: "Public Keys",
            type: "string",
        })
        .demandOption(["keysFile"])
        .help()
        .alias("help", "h").argv;

    const privateKey = getPotionPrivateKey();

    const publicKeysJSON = fs.readFileSync(argv.keysFile);
    const publicKeys = JSON.parse(publicKeysJSON);

    let secrets = [];
    const subkeyLength = privateKey.length / publicKeys.length;
    for (let i = 0; i < publicKeys.length; ++i) {
        const encryptedSecret = signMetamaskMessage(
            publicKeys[i],
            privateKey.subarray(i * subkeyLength, (i + 1) * subkeyLength),
        );

        secrets.push(encryptedSecret);
    }

    console.log(secrets);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

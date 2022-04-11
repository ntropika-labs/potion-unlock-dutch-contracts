require("dotenv").config();

const { verifyNFTValidator } = require("./deployUtils");
const { color } = require("console-log-colors");
const { red, green } = color;

async function main() {
    const success = await verifyNFTValidator(
        "0x5E0847C844534e0183e065fcA2e638E34ff8b09c",
        "0xEDAC702337b70f176423175d2f30fDf9c7a613A4",
    );

    if (!success) {
        console.log(`\n\n${red("ERROR validating the contract")}`);
    } else {
        console.log(`\n\n${green("Contract succesfully validated!")}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

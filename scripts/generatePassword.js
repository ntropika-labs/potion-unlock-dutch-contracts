const { randomBytes } = require("./lib/nacl.js");
const { bufferToHex } = require("ethereumjs-util");
const { encryptPassword } = require("./lib/utils.js");

require("dotenv").config();

async function main() {
    const potionGenesis = process.env.POTION_GENESIS;
    const potionGenesisLength = Buffer.from(potionGenesis, "hex").length;

    const passwordGenesis = bufferToHex(randomBytes(potionGenesisLength - 40));

    const encryptedPasswordGenesis = encryptPassword(passwordGenesis.slice(2));
    const encryptedPasswordGenesisLength = Buffer.from(encryptedPasswordGenesis.slice(2), "hex").length;

    if (potionGenesisLength !== encryptedPasswordGenesisLength) {
        throw new Error(
            `Cannot generate a proper password genesis (${encryptedPasswordGenesisLength}) for the given genesis size (${potionGenesisLength})`,
        );
    }

    console.log(`PASSWORD_GENESIS=${passwordGenesis}`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

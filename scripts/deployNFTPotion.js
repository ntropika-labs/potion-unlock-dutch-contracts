require("dotenv").config();
const { CID } = require("multiformats/cid");
const { confirmAction, ErrorAndExit } = require("../scripts/lib/ui_utils");
const { getBufferPreview } = require("../scripts/lib/utils");
const { deployPotionNFTGame } = require("./deployUtils");
const { color } = require("console-log-colors");
const { red, yellow, bold } = color;
const { NFT_NAME, NFT_SYMBOL, USDC_ADDRESSES } = require("./config");
const { network } = require("hardhat");

async function _validateIPFSConfig() {
    if (process.env.IPFS_PREFIX.startsWith("ipfs://") === false) {
        throw new Error("IPFS prefix must start with 'ipfs://'");
    }

    if (process.env.IPFS_PREFIX.endsWith("/") === false) {
        throw new Error("IPFS suffix must end with '/'");
    }

    if (process.env.IPFS_SUFFIX !== ".json") {
        throw new Error("IPFS suffix must be '.json'");
    }

    // Check the CID format
    try {
        const cid = process.env.IPFS_PREFIX.slice("ipfs://".length, -1);
        CID.parse(cid);
    } catch (e) {
        console.log(red("Invalid CID in IPFS prefix, cannot parse it. Follows the full error:"));
        throw e;
    }
}

async function main() {
    await _validateIPFSConfig();

    // Show config and ask for confirmation
    console.log(bold("[CONFIG]"));
    console.log(yellow(`  - NFT Name:           `) + `${NFT_NAME}`);
    console.log(yellow(`  - NFT Symbol:         `) + `${NFT_SYMBOL}`);
    console.log(
        yellow(`  - USDC Address:       `) +
            `${USDC_ADDRESSES[network.name] ? USDC_ADDRESSES[network.name] : "[Needs deployment]"}`,
    );
    console.log(yellow(`  - IPFS Prefix:        `) + `${process.env.IPFS_PREFIX}`);
    console.log(yellow(`  - IPFS Suffix:        `) + `${process.env.IPFS_SUFFIX}`);
    console.log(
        yellow(`  - Potion Genesis:     `) + `${getBufferPreview(Buffer.from(process.env.POTION_GENESIS, "hex"))}`,
    );
    console.log(
        yellow(`  - Password Genesis:   `) + `${getBufferPreview(Buffer.from(process.env.PASSWORD_GENESIS, "hex"))}`,
    );
    console.log(
        yellow(`  - Encrypted Password: `) + `${getBufferPreview(Buffer.from(process.env.ENCRYPTED_PASSWORD, "hex"))}`,
    );

    if (!(await confirmAction("\nContinue with the above configuration? (y/N) "))) {
        ErrorAndExit("\nAborting deployment...");
    }

    await deployPotionNFTGame();
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

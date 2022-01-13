require("dotenv").config();
const { CID } = require("multiformats/cid");
const { confirmAction, ErrorAndExit } = require("../scripts/lib/ui_utils");
const { deployPotionNFTGame } = require("./deployUtils");
const { color } = require("console-log-colors");
const { red, yellow, bold } = color;

async function _validateIPFSConfig() {
    console.log(bold("Using IPFS config:"));
    console.log(yellow(`  - Prefix: `) + `${process.env.IPFS_PREFIX}`);
    console.log(yellow(`  - Suffix: `) + `${process.env.IPFS_SUFFIX}`);

    if (process.env.IPFS_PREFIX.startsWith("ipfs://") === false) {
        throw new Error("IPFS prefix must start with 'ipfs://'");
    }

    if (process.env.IPFS_PREFIX.endsWith("/") === false) {
        throw new Error("IPFS suffix must end with '/'");
    }

    if (process.env.IPFS_SUFFIX.startsWith(".") === false) {
        throw new Error("IPFS suffix must start with a '.'");
    }

    if (process.env.IPFS_SUFFIX.length <= 1) {
        throw new Error("IPFS suffix must have a suffix after the initial dot");
    }

    // Check the CID format
    try {
        const cid = process.env.IPFS_PREFIX.slice("ipfs://".length, -1);
        CID.parse(cid);
    } catch (e) {
        console.log(red("Invalid CID in IPFS prefix, cannot parse it. Follows the full error:"));
        throw e;
    }

    /*if (ciparsedCIDdHex === undefined || cidHex.length !== 32) {
        throw new Error("IPFS prefix must be a valid CID");
    }*/

    if (!(await confirmAction("\nContinue with the above configuration? (y/N) "))) {
        ErrorAndExit("\nAborting deployment...");
    }
}

async function main() {
    await _validateIPFSConfig();
    await deployPotionNFTGame();
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

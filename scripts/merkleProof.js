const { MESSAGE } = require("./config");

const yargs = require("yargs");
const { buildMerkleTree, getMerkleLeaves } = require("./utils");

async function main() {
    const argv = await yargs
        .option("tokenId", {
            alias: "t",
            description: "Token ID",
            type: "number",
        })
        .demandOption(["tokenId"])
        .help()
        .alias("help", "h").argv;

    const merkleTree = buildMerkleTree(MESSAGE);
    const tokenId = argv.tokenId;

    let leaves = getMerkleLeaves(MESSAGE);

    const proofHex = merkleTree.getHexProof(leaves[tokenId - 1]);

    const proofSolidity = '["' + proofHex.join('", "') + '"]';

    console.log(`Decrypted Secret: 0x${Number(MESSAGE.charCodeAt(tokenId - 1)).toString(16)}`);
    console.log(`Proof: ${proofSolidity}`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

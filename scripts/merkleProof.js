const { NUM_NFTS } = require("./config");

const yargs = require("yargs");
const { buildMerkleTree, getMerkleLeaves, getPotionPrivateKey } = require("./utils");

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

    const potionPrivateKey = getPotionPrivateKey();
    const merkleTree = buildMerkleTree(potionPrivateKey, NUM_NFTS);

    const tokenId = argv.tokenId;

    const leaves = getMerkleLeaves(potionPrivateKey, NUM_NFTS);

    const proofHex = merkleTree.getHexProof(leaves[tokenId - 1]);

    const proofSolidity = '["' + proofHex.join('", "') + '"]';

    console.log(merkleTree.getHexRoot());
    console.log(`Proof: ${proofSolidity}`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

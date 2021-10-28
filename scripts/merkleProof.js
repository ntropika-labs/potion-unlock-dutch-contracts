const { NUM_NFTS } = require("./config");

const yargs = require("yargs");
const { buildMerkleTree, getMerkleLeaves, getPotionPrivateKey, getPotionGenesis } = require("./utils");

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

    const potionGenesis = getPotionGenesis();
    const merkleTree = buildMerkleTree(potionGenesis, NUM_NFTS);

    const tokenId = argv.tokenId;

    const leaves = getMerkleLeaves(potionGenesis, NUM_NFTS);

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

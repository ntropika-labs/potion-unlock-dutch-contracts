const { NUM_NFTS } = require("./config");

const yargs = require("yargs");
const { bufferToHex } = require("ethereumjs-util");
const { buildMerkleTree, getMerkleLeaves, getPotionGenesis, getRaritiesConfig } = require("./lib/utils");

async function main() {
    const argv = await yargs
        .option("tokenId", {
            alias: "t",
            description: "Start Token ID",
            type: "number",
        })
        .option("numElements", {
            alias: "n",
            description: "Number of proofs to generate starting at tokenId",
            default: 1,
            type: "number",
        })
        .demandOption(["tokenId"])
        .help()
        .alias("help", "h").argv;

    const potionGenesis = getPotionGenesis();
    const rarityConfig = getRaritiesConfig();
    const merkleTree = buildMerkleTree(potionGenesis, rarityConfig);

    const tokenId = argv.tokenId;

    const leaves = getMerkleLeaves(potionGenesis, rarityConfig);

    console.log(merkleTree.getHexRoot());

    // Just one element
    if (argv.numElements === 1) {
        const proofHex = merkleTree.getHexProof(leaves[tokenId - 1]);
        const proofSolidity = '["' + proofHex.join('", "') + '"]';

        console.log(`Proof: ${proofSolidity}`);
        return;
    }

    // List of elements
    const tokenIDList = [];
    const decryptedSecretList = [];
    const proofList = [];

    const subkeyLength = potionGenesis.length / NUM_NFTS;

    for (let i = 0; i < argv.numElements; ++i) {
        const proofHex = merkleTree.getHexProof(leaves[tokenId + i - 1]);
        const proofSolidity = '["' + proofHex.join('", "') + '"]';

        tokenIDList.push(tokenId + i);
        decryptedSecretList.push(
            bufferToHex(potionGenesis.subarray((tokenId + i - 1) * subkeyLength, (tokenId + i) * subkeyLength)),
        );
        proofList.push(proofSolidity);
    }

    console.log(`Token IDs: ${JSON.stringify(tokenIDList)}`);
    console.log(`Decrypted Secrets: ${JSON.stringify(decryptedSecretList)}`);
    console.log(`Proofs: [${proofList}]`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

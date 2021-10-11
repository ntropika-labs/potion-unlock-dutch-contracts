const { MESSAGE } = require("./config");
const yargs = require("yargs");
const keccak256 = require("keccak256");
const { buildMerkleTree, encryptSecret, getSecretLeaves } = require("./utils");

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

    let secret = encryptSecret(MESSAGE);

    const merkleTree = buildMerkleTree(secret);
    const tokenId = argv.tokenId;

    let leaves = getSecretLeaves(secret);
    const encryptedLeaves = leaves.map(x => keccak256(x));

    const proofHex = merkleTree.getHexProof(encryptedLeaves[tokenId - 1]);

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

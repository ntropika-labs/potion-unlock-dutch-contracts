const { buildMerkleTree, getMerkleLeaves, getPotionGenesis, getRaritiesConfig } = require("./lib/utils");

function getMerkleProof(tokenId) {
    const potionGenesis = getPotionGenesis();
    const rarityConfig = getRaritiesConfig();
    const merkleTree = buildMerkleTree(potionGenesis, rarityConfig);

    const leaves = getMerkleLeaves(potionGenesis, rarityConfig);

    const proofHex = merkleTree.getHexProof(leaves[tokenId - 1]);

    return JSON.parse('["' + proofHex.join('", "') + '"]');
}

module.exports = { getMerkleProof };

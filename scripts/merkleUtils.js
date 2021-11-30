const { buildMerkleTree, getPotionGenesis, getRaritiesConfig } = require("./lib/utils");

function getMerkleProof(tokenId) {
    const potionGenesis = getPotionGenesis();
    const rarityConfig = getRaritiesConfig();
    const { merkleTree, leaves } = buildMerkleTree(potionGenesis, rarityConfig);

    return getMerkleProofWithTree(tokenId, merkleTree, leaves);
}

function getMerkleProofWithTree(tokenId, merkleTree, leaves) {
    const proofHex = merkleTree.getHexProof(leaves[tokenId - 1]);

    return JSON.parse('["' + proofHex.join('", "') + '"]');
}

module.exports = { getMerkleProof, getMerkleProofWithTree };

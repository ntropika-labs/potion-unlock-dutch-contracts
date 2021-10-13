// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "hardhat/console.sol";

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract NFTValidator is Context {
    /**
        Storage
     */
    bytes32 public merkleRoot;
    uint256 public maxSecretNFTs;
    IERC721 public NFTContract;
    mapping(uint256 => bool) public isValidated;
    uint256 public partialSecretSize;
    bytes public finalMessage;

    /**
        Events
     */
    event NFTValidated(address owner, uint256 tokenId);

    /**
        Constructor
    */
    constructor(
        address _NFTContract,
        bytes32 _merkleRoot,
        uint256 _maxSecretNFTs,
        uint256 _partialSecretSize
    ) {
        merkleRoot = _merkleRoot;
        maxSecretNFTs = _maxSecretNFTs;
        NFTContract = IERC721(_NFTContract);
        partialSecretSize = _partialSecretSize;

        finalMessage = new bytes(_partialSecretSize * _maxSecretNFTs);
    }

    /**
        Mutating functions
     */
    function validate(
        uint256 tokenId,
        bytes memory decryptedSecret,
        bytes32[] memory proof
    ) external {
        require(NFTContract.ownerOf(tokenId) == _msgSender(), "ITO"); // Invalid T Owner
        require(tokenId <= maxSecretNFTs, "ITID"); // Invalid Token ID
        require(!isValidated[tokenId], "TAV"); // Token Already Validated

        bytes memory data = abi.encodePacked(tokenId, decryptedSecret);
        bytes32 leaf = keccak256(data);
        console.log("Data");
        console.logBytes(data);
        console.log("Leaf");
        console.logBytes32(leaf);

        require(verifyMerkleProof(merkleRoot, leaf, proof), "FV"); // Failed Validation

        copyDecryptedSecret(tokenId, decryptedSecret);

        emit NFTValidated(_msgSender(), tokenId);
    }

    function copyDecryptedSecret(uint256 tokenId, bytes memory decryptedSecret) internal {
        for (uint256 i = 0; i < decryptedSecret.length; ++i) {
            finalMessage[partialSecretSize * (tokenId - 1) + i] = decryptedSecret[i];
        }
    }

    /**
        Copied from https://github.com/miguelmota/merkletreejs-solidity
     */
    function verifyMerkleProof(
        bytes32 root,
        bytes32 leaf,
        bytes32[] memory proof
    ) internal view returns (bool) {
        bytes32 computedHash = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];

            console.log("Proof element");
            console.logBytes32(proofElement);
            console.log("Computed hash");
            console.logBytes32(computedHash);

            if (computedHash < proofElement) {
                console.log("Proof element is greater");
                // Hash(current computed hash + current element of the proof)
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                console.log("Proof element is smaller");
                // Hash(current element of the proof + current computed hash)
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }

        // Check if the computed hash (root) is equal to the provided root
        console.log("Final check");
        console.logBytes32(computedHash);
        console.logBytes32(root);
        return computedHash == root;
    }
}

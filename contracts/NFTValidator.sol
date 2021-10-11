// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "hardhat/console.sol";

import "@openzeppelin/contracts/utils/Context.sol";

import { ISVGNFT } from "./SVGNFT.sol";

contract NFTValidator is Context {
    /**
        Storage
     */
    bytes32 public merkleRoot;
    uint256 public maxSecretNFTs;
    ISVGNFT public NFTContract;
    mapping(uint256 => bool) public isValidated;

    bytes public finalMessage;

    /**
        Events
     */
    event NFTValidated(address owner, uint256 tokenId);

    /**
        Modifiers
     */
    modifier checkTokenId(uint256 tokenId) {
        require(tokenId <= maxSecretNFTs, "ITID"); // Invalid Token ID
        require(!isValidated[tokenId], "TAV"); // Token Already Validated
        _;
    }

    /**
        Constructor
    */
    constructor(
        address _NFTContract,
        bytes32 _merkleRoot,
        uint256 _maxSecretNFTs
    ) {
        merkleRoot = _merkleRoot;
        maxSecretNFTs = _maxSecretNFTs;
        NFTContract = ISVGNFT(_NFTContract);

        finalMessage = new bytes(_maxSecretNFTs); // NOTE: This can be expensive when we go for the MVP
    }

    /**
        Mutating functions
     */
    function validate(
        uint256 tokenId,
        bytes1 decryptedSecret,
        bytes32[] memory proof
    ) external checkTokenId(tokenId) {
        bytes32 leaf = keccak256(abi.encodePacked(tokenId, decryptedSecret));
        require(verifyMerkleProof(merkleRoot, leaf, proof), "FV"); // Failed Validation

        finalMessage[tokenId - 1] = decryptedSecret;

        emit NFTValidated(_msgSender(), tokenId);
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

    function getMessage() external view returns (string memory) {
        return string(finalMessage);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/Context.sol";
import "./INFTPotion.sol";

contract NFTPotionValidator is Context {
    //------------
    // Storage
    //------------
    bytes32 public merkleRoot;
    INFTPotion public NFTContract;
    mapping(uint256 => bool) public isValidated;
    uint256 public partialSecretSize;
    bytes public finalMessage;

    //------------
    // Events
    //------------
    event NFTValidated(address owner, uint256 tokenId);

    //---------------
    // Constructor
    //---------------
    constructor(
        address _NFTContract,
        bytes32 _merkleRoot,
        uint256 _secretSize
    ) {
        merkleRoot = _merkleRoot;
        NFTContract = INFTPotion(_NFTContract);

        finalMessage = new bytes(_secretSize);
    }

    //---------------------
    // Mutating functions
    //---------------------

    /**
        @notice Validates the decrypted secret against the merkle root and stores it in the finalMessage
                if validation is successful.

        @param tokenId The token id of the NFT that is being validated
        @param decryptedSecret The decrypted secret associated with the NFT
        @param proof The merkle proof for the decrypted secret
      */
    function validate(
        uint256 tokenId,
        bytes memory decryptedSecret,
        bytes32[] memory proof
    ) public {
        require(NFTContract.ownerOf(tokenId) == _msgSender(), "ITO"); // Invalid Token Owner
        require(!isValidated[tokenId], "TAV"); // Token Already Validated

        bytes memory data = abi.encodePacked(tokenId, decryptedSecret);
        bytes32 leaf = keccak256(data);

        require(verifyMerkleProof(merkleRoot, leaf, proof), "FV"); // Failed Validation

        copyDecryptedSecret(tokenId, decryptedSecret);

        emit NFTValidated(_msgSender(), tokenId);
    }

    /**
        @notice Batch validation of multiple NFTs

        @param tokenIds List of token Ids to be validated
        @param decryptedSecrets List of decrypted secrets associated with the token Ids
        @param proofs List of merkle proofs for the decrypted secrets

        @dev See validate() for more details
      */
    function validateList(
        uint256[] calldata tokenIds,
        bytes[] calldata decryptedSecrets,
        bytes32[][] calldata proofs
    ) external {
        for (uint256 i = 0; i < tokenIds.length; ++i) {
            validate(tokenIds[i], decryptedSecrets[i], proofs[i]);
        }
    }

    /**
        @notice Copies the decrypted secret into the finalMessage at the right location using
                the rarities configuration

        @param tokenId The token id of the NFT which decrypted secret is being copied
        @param decryptedSecret The decrypted secret associated with the NFT
    */
    function copyDecryptedSecret(uint256 tokenId, bytes memory decryptedSecret) internal {
        (uint256 start, uint256 length, bool found) = NFTContract.getSecretPositionLength(tokenId);

        require(found, "CRITICAL!! Token ID could not be found in rarity config");
        require(start + length <= finalMessage.length, "CRITICAL!! Decrypted secret position exceeds secret length");

        uint256 dst;
        uint256 src;

        // Setup
        assembly {
            mstore(0x0, finalMessage.slot)
            dst := keccak256(0x0, 0x20)
            dst := add(dst, div(start, 0x20))
            src := add(decryptedSecret, 0x20)
        }

        // Copy leading bytes
        assembly {
            let modulo := mod(start, 0x20)
            if gt(modulo, 0) {
                let srcValue := shr(mul(8, modulo), mload(src))
                let dstValue := sload(dst)

                sstore(dst, or(srcValue, dstValue))

                let copiedBytes := sub(0x20, modulo)
                src := add(src, copiedBytes)
                dst := add(dst, 1)

                length := sub(length, copiedBytes)
            }
        }

        // Mid copy
        for (uint256 i = 32; i < length; i += 32) {
            assembly {
                let value := mload(src)
                sstore(dst, value)
                dst := add(dst, 1)
                src := add(src, 0x20)
            }
        }

        // Last copy
        assembly {
            if gt(length, 0) {
                let value2 := sload(dst)
                let value1 := mload(src)

                sstore(dst, or(value1, value2))
            }
        }
    }

    /**
        @notice Verifies the merkle proof for the given leaf

        @param root The merkle root
        @param leaf The leaf to be verified
        @param proof The merkle proof for the leaf

        @dev Copied from https://github.com/miguelmota/merkletreejs-solidity
     */
    function verifyMerkleProof(
        bytes32 root,
        bytes32 leaf,
        bytes32[] memory proof
    ) internal pure returns (bool) {
        bytes32 computedHash = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];

            if (computedHash < proofElement) {
                // Hash(current computed hash + current element of the proof)
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                // Hash(current element of the proof + current computed hash)
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }

        // Check if the computed hash (root) is equal to the provided root
        return computedHash == root;
    }
}

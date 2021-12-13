// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./INFTPotion.sol";
import "./INFTPotionValidator.sol";

contract NFTPotionValidator is INFTPotionValidator, Ownable {
    //------------
    // Storage
    //------------
    bytes32 public merkleRoot;
    INFTPotion public NFTContract;
    mapping(uint256 => bool) public isTokenValidated;

    //---------------
    // Constructor
    //---------------
    constructor(address _NFTContract, bytes32 _merkleRoot) {
        merkleRoot = _merkleRoot;
        NFTContract = INFTPotion(_NFTContract);
    }

    //---------------------
    // Validate functions
    //---------------------

    /**
        @notice Validates the decrypted secret against the merkle root 

        @param tokenId The token id of the NFT that is being validated
        @param decryptedSecret The decrypted secret associated with the NFT
        @param proof The merkle proof for the decrypted secret

        @dev See _validate for more details
      */
    function validate(
        uint256 tokenId,
        bytes calldata decryptedSecret,
        bytes32[] calldata proof
    ) public {
        uint256 secretStartPos = _validate(tokenId, decryptedSecret, proof);
        emit NFTValidated(_msgSender(), tokenId, secretStartPos, decryptedSecret);
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
        require(tokenIds.length == decryptedSecrets.length, "ALM"); // Array Length Mismatch
        require(tokenIds.length == proofs.length, "ALM"); // Array Length Mismatch

        uint256[] memory secretStartPosList = new uint256[](tokenIds.length);

        for (uint256 i = 0; i < tokenIds.length; ++i) {
            secretStartPosList[i] = _validate(tokenIds[i], decryptedSecrets[i], proofs[i]);
        }

        emit NFTListValidated(_msgSender(), tokenIds, secretStartPosList, decryptedSecrets);
    }

    //--------------------
    // Internal functions
    //--------------------

    /**
        @notice Validates the decrypted secret against the merkle root and stores if the token has
        being validated or not

        @param tokenId The token id of the NFT that is being validated
        @param decryptedSecret The decrypted secret associated with the NFT
        @param proof The merkle proof for the decrypted secret

        @return The position in the final secret of the decrypted secret

        @dev secretStartPost can be used as a key to understand if a piece of secret has been already
        validated or not
      */
    function _validate(
        uint256 tokenId,
        bytes calldata decryptedSecret,
        bytes32[] calldata proof
    ) internal returns (uint256) {
        require(NFTContract.ownerOf(tokenId) == _msgSender(), "ITO"); // Invalid Token Owner
        require(!isTokenValidated[tokenId], "TAV"); // Token Already Validated

        (uint256 secretStartPos, , bool found) = NFTContract.getSecretPositionLength(tokenId);
        require(found, "CRITICAL!! Token ID could not be found in rarity config");

        _verify(tokenId, decryptedSecret, proof);

        isTokenValidated[tokenId] = true;

        return secretStartPos;
    }

    /**
        Verifies the merkle proof for the given decrypted secret

        @param tokenId The token id of the NFT that is being validated
        @param decryptedSecret The decrypted secret associated with the NFT
        @param proof The merkle proof for the decrypted secret

    */
    function _verify(
        uint256 tokenId,
        bytes calldata decryptedSecret,
        bytes32[] calldata proof
    ) internal view {
        bytes memory data = abi.encodePacked(tokenId, decryptedSecret);
        bytes32 leaf = keccak256(data);

        require(MerkleProof.verify(proof, merkleRoot, leaf), "FV"); // Failed Validation
    }
}

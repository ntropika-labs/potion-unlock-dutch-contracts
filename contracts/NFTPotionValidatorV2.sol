// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./INFTPotion.sol";

contract NFTPotionValidatorV2 is Context, Ownable, Pausable {
    //------------
    // Storage
    //------------
    bytes32 public merkleRoot;
    INFTPotion public NFTContract;
    mapping(uint256 => bool) public isTokenValidated;

    //------------
    // Events
    //------------
    event NFTValidated(address indexed owner, uint256 indexed tokenId, uint256 secretStartPos, bytes decryptedSecret);

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
        @notice Validates the decrypted secret against the merkle root and stores it in the finalMessage
                if validation is successful.

        @param tokenId The token id of the NFT that is being validated
        @param decryptedSecret The decrypted secret associated with the NFT
        @param proof The merkle proof for the decrypted secret

        @dev secretStartPost can be used as a key to understand if a piece of secret has been already
        validated or not
      */
    function validate(
        uint256 tokenId,
        bytes calldata decryptedSecret,
        bytes32[] calldata proof
    ) public whenNotPaused {
        require(NFTContract.ownerOf(tokenId) == _msgSender(), "ITO"); // Invalid Token Owner
        require(!isTokenValidated[tokenId], "TAV"); // Token Already Validated

        (uint256 secretStartPos, , bool found) = NFTContract.getSecretPositionLength(tokenId);
        require(found, "CRITICAL!! Token ID could not be found in rarity config");

        _verify(tokenId, decryptedSecret, proof);

        isTokenValidated[tokenId] = true;

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
        for (uint256 i = 0; i < tokenIds.length; ++i) {
            validate(tokenIds[i], decryptedSecrets[i], proofs[i]);
        }
    }

    //------------------
    // Owner functions
    //------------------

    /**
        @notice Pauses the contract by stopping the validation functionality

        @dev Owner only
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
        @notice Unpauses the contract allowing validation again

        @dev Owner only
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    //--------------------
    // Internal functions
    //--------------------

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

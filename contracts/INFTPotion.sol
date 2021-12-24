// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface INFTPotion is IERC721 {
    /**
        Contains the info about a range of NFTs purchased by the user

        @param startTokenId The first token ID of the range
        @param amount The amount of tokens in the range
     */
    struct PurchasedRange {
        uint32 startTokenId;
        uint32 amount;
    }

    /**
        @notice Mints the number of tokens requested by the caller

        @param rarityId The ID of the rarity config to use
        @param amount The amount of tokens to mint
        @param recipient The recipient of the newly minted token
     */
    function mint(
        uint256 rarityId,
        uint32 amount,
        address recipient
    ) external returns (uint32);

    /**
        @notice Requests the total number of NFTs to be sold for the given rarity ID

        @param rarityId The rarity IDs of the NFTs to purchase

        @return The total number of NFTs to be sold for the given rarity
     */
    function getRemainingNFTs(uint256 rarityId) external view returns (uint32);

    /**
        @notice Calculates the position and length of the fragment of fullSecret associated
        with the given token ID

        @param tokenId ID of the token to get the fragment for

        @return start Position of the fragment in fullSecret
        @return length Length of the fragment
        @return found Whether the position and length were found
     */
    function getSecretPositionLength(uint256 tokenId)
        external
        returns (
            uint256 start,
            uint256 length,
            bool found
        );

    /**
        @notice Transfer the NFT ownership to a new owner

        @param newOwner The address of the new owner

        @dev If a new auciton contract is deployed that uses the same NFT contract,
        this method can be used to transfer the ownership of the NFT to the new
        auction contract or even to an admin wallet to manually mint tokens
     */
    function transferOwnership(address newOwner) external;
}

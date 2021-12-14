// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface INFTPotion is IERC721 {
    /**
        Contains the info about a range of NFTs purchased by the user

        @param startTokenId The first token ID of the range
        @param amount The amount of tokens in the range
     */
    struct PurchasedRange {
        uint128 startTokenId;
        uint128 amount;
    }

    function getSecretPositionLength(uint256 tokenId)
        external
        returns (
            uint256 start,
            uint256 length,
            bool found
        );
}

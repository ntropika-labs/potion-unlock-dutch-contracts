// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface INFTPotion is IERC721 {
    function getSecretPositionLength(uint256 tokenId)
        external
        returns (
            uint256 start,
            uint256 length,
            bool found
        );
}

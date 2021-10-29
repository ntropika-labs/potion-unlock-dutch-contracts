// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface INFTPotionWhitelist {
    struct WhitelistData {
        uint256 firstId;
        uint256 lastId;
    }

    function getWhitelistRanges(address buyer) external returns (WhitelistData[] memory);
}

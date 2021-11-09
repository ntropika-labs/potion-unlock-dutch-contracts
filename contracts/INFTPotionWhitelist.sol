// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface INFTPotionWhitelist {
    struct WhitelistData {
        uint128 firstId;
        uint128 lastId;
    }

    function getWhitelistRanges(address buyer) external returns (WhitelistData[] memory);
}

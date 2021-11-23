// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface INFTPotionWhitelistExternal {
    struct WhitelistData {
        uint128 firstId;
        uint128 lastId;
    }

    function whitelistOne(
        address bidder,
        uint128 startId,
        uint128 amount
    ) external;

    function getWhitelistRanges(address buyer) external returns (WhitelistData[] memory);
}

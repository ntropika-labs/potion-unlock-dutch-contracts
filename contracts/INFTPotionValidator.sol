// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface INFTPotionValidator {
    event NFTValidated(address indexed owner, uint256 indexed tokenId, uint256 secretStartPos, bytes decryptedSecret);
    event NFTListValidated(
        address indexed owner,
        uint256[] tokenIds,
        uint256[] secretStartPosList,
        bytes[] decryptedSecrets
    );
}

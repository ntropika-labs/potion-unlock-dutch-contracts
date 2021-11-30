// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface INFTPotionValidatorV2 {
    event NFTValidated(address indexed owner, uint256 indexed tokenId, uint256 secretStartPos, bytes decryptedSecret);
}

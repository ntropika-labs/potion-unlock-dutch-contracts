// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

struct RarityConfigItem {
    // Keep the struct under 32 bytes
    uint32 startTokenId;
    uint32 endTokenId;
    uint32 secretSegmentStart;
    uint32 secretSegmentLength;
    uint32 bytesPerPiece;
}

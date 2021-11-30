// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
    @notice Contains the configuration for a specific NFT rarity. This includes the
    NFT token ID range (start and end, both included), the segment of the secret
    associated with the rarity (secret segment start and length) and how many bytes
    from that secret segment are associated to each NFT token of this rarity

    The specific secret piece associated to a specifig NFT token ID is calculated by
    sequentially assigning bytesPerPiece bytes from the secret segment to each NFT token
    ID starting at startTokenId. If the end of the secret segment is reached, then the
    segment is considered a circular buffer and the process starts again from the beginning

    @dev Keep the struct under 32 bytes to fit it in a single slot
 */
struct RarityConfigItem {
    uint32 startTokenId;
    uint32 endTokenId;
    uint32 secretSegmentStart;
    uint32 secretSegmentLength;
    uint32 bytesPerPiece;
}

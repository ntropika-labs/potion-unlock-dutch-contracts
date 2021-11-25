// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./NFTPotionDutchAuction.sol";
import "./RarityConfigItem.sol";

/**
    NFT contract for Potion Unlock
 */
contract NFTPotionV2 is ERC721URIStorage, NFTPotionDutchAuction {
    // Storage
    string public ipfsPrefix;
    string public ipfsSuffix;
    bytes public fullSecret;
    mapping(uint256 => string) public encryptionKeys;
    RarityConfigItem[] public rarityConfig;
    uint256 nextTokenId = 1;

    // Constructor
    constructor(
        string memory _tokenName,
        string memory _tokenSymbol,
        string memory _ipfsPrefix,
        string memory _ipfsSuffix,
        bytes memory _fullSecret,
        RarityConfigItem[] memory _rarityConfig
    ) ERC721(_tokenName, _tokenSymbol) {
        ipfsPrefix = _ipfsPrefix;
        ipfsSuffix = _ipfsSuffix;
        fullSecret = _fullSecret;

        for (uint256 i = 0; i < _rarityConfig.length; ++i) {
            rarityConfig.push(_rarityConfig[i]);
        }
    }

    /**
        @notice Mints the number of tokens requested by the caller

        @param amount The amount of tokens to mint
        @param publicKey The public key of the minter
     */
    function _purchaseItems(uint256 amount, string calldata publicKey) internal override {
        for (uint256 i = 0; i < amount; ++i) {
            encryptionKeys[nextTokenId] = publicKey;

            _safeMint(msg.sender, nextTokenId);

            nextTokenId++;
        }
    }

    // View functions

    /**
        @notice returns the NFT artwork for the given token ID

        @param tokenId ID of the token to get the artwork for

        @return the artwork for the given token ID
    */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (ownerOf(tokenId) == address(0)) {
            return "";
        }

        return string(abi.encodePacked(ipfsPrefix, _uint2str(tokenId), ipfsSuffix));
    }

    /**
        @notice Calculates the position and length of the fragment of fullSecret associated
        with the given token ID

        @param tokenId ID of the token to get the fragment for

        @return start Position of the fragment in fullSecret
        @return length Length of the fragment
        @return found Whether the position and length were found
     */
    function getSecretPositionLength(uint256 tokenId)
        public
        view
        returns (
            uint256 start,
            uint256 length,
            bool found
        )
    {
        for (uint256 i = 0; i < rarityConfig.length; ++i) {
            RarityConfigItem storage config = rarityConfig[i];

            if (tokenId >= config.startTokenId && tokenId <= config.endTokenId) {
                uint256 fragmentNumPieces = config.secretSegmentLength / config.bytesPerPiece;
                uint256 pieceIndex = (tokenId - config.startTokenId) % fragmentNumPieces;

                start = config.secretSegmentStart + pieceIndex * config.bytesPerPiece;
                length = config.bytesPerPiece;

                found = true;
                break;
            }
        }
    }

    /**
        @notice Returns the fragment of fullSecret associated with the given token ID

        @param tokenId ID of the token to get the secret for

        @return The fragment of fullSecret associated with the given token ID
     */
    function secret(uint256 tokenId) external view returns (bytes memory) {
        if (ownerOf(tokenId) == address(0)) {
            return new bytes(0);
        }

        (uint256 start, uint256 length, bool found) = getSecretPositionLength(tokenId);
        if (!found) {
            return new bytes(0);
        }

        bytes memory out = new bytes(length);

        for (uint256 i = 0; i < length; ++i) {
            out[i] = fullSecret[start + i];
        }

        return out;
    }

    //---------------------
    // Internal functions
    //---------------------

    /**
        @notice Converts a number to its string representation
     */
    function _uint2str(uint256 _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len - 1;
        while (_i != 0) {
            unchecked {
                bstr[k--] = bytes1(uint8(48 + (_i % 10)));
            }
            _i /= 10;
        }
        return string(bstr);
    }
}

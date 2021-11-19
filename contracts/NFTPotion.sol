// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./NFTPotionAuction.sol";
import "./RarityConfigItem.sol";

contract NFTPotion is ERC721URIStorage, Ownable, Pausable {
    //--------------
    // Storage
    //--------------
    string public ipfsPrefix;
    string public ipfsSuffix;
    bytes public fullSecret;
    mapping(uint256 => string) public encryptionKeys;
    INFTPotionWhitelist whitelist;
    RarityConfigItem[] public rarityConfig;

    //--------------
    // Modifiers
    //--------------
    modifier checkWhitelist(uint256 tokenId) {
        INFTPotionWhitelist.WhitelistData[] memory ranges = whitelist.getWhitelistRanges(_msgSender());

        bool isWhitelisted;
        for (uint256 i = 0; i < ranges.length; ++i) {
            if (tokenId >= ranges[i].firstId && tokenId <= ranges[i].lastId) {
                isWhitelisted = true;
                break;
            }
        }
        require(isWhitelisted, "Not whitelisted for token ID");
        _;
    }

    //---------------
    // Constructor
    //---------------
    constructor(
        string memory _tokenName,
        string memory _tokenSymbol,
        string memory _ipfsPrefix,
        string memory _ipfsSuffix,
        bytes memory _fullSecret,
        address _whitelist,
        RarityConfigItem[] memory _rarityConfig
    ) ERC721(_tokenName, _tokenSymbol) {
        ipfsPrefix = _ipfsPrefix;
        ipfsSuffix = _ipfsSuffix;
        fullSecret = _fullSecret;
        whitelist = INFTPotionWhitelist(_whitelist);

        for (uint256 i = 0; i < _rarityConfig.length; ++i) {
            rarityConfig.push(_rarityConfig[i]);
        }
    }

    //--------------------
    // Minting functions
    //--------------------

    /**
        @notice Mints a new token if it's been whitelisted for the caller

        @param tokenId The ID of the token to mint
        @param publicKey The public key to be used for genesis encryption
     */
    function mint(uint256 tokenId, string calldata publicKey) public checkWhitelist(tokenId) whenNotPaused {
        _safeMint(msg.sender, tokenId);

        encryptionKeys[tokenId] = publicKey;
    }

    /**
        @notice Mints a batch of tokenIDs

        @param tokenIds List of token IDs to be minted
        @param publicKey The public key to be used for genesis encryption
     */
    function mintList(uint256[] calldata tokenIds, string calldata publicKey) external {
        for (uint256 i = 0; i < tokenIds.length; ++i) {
            mint(tokenIds[i], publicKey);
        }
    }

    //------------------
    // Owner functions
    //------------------

    /**
        @notice Pauses the contract by stopping the minting functionality

        @dev Owner only
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
        @notice Unpauses the contract allowing minting again

        @dev Owner only
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    //------------------
    // View functions
    //------------------

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

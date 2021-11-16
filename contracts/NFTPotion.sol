// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

import "./NFTPotionAuction.sol";
import "./RarityConfigItem.sol";

contract NFTPotion is ERC721URIStorage, Ownable {
    /**
        Storage
     */
    string public ipfsPrefix;
    string public ipfsSuffix;
    uint256 public numMintedTokens;
    bytes public fullSecret;
    mapping(uint256 => string) public encryptionKeys;
    INFTPotionWhitelist whitelist;
    RarityConfigItem[] public rarityConfig;

    /**
        Events
     */
    event Mint(uint256 indexed tokenId, string tokenURI);

    /**
        Modifiers
    */
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

    /**
        Constructor
     */
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

    /**
        Mutating functions
     */
    function mint(uint256 tokenId, string calldata publicKey) public checkWhitelist(tokenId) {
        _safeMint(msg.sender, tokenId);

        encryptionKeys[tokenId] = publicKey;
    }

    function mintList(uint256[] calldata tokenIds, string calldata publicKey) external {
        for (uint256 i = 0; i < tokenIds.length; ++i) {
            mint(tokenIds[i], publicKey);
        }
    }

    /**
        View functions
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return string(abi.encodePacked(ipfsPrefix, uint2str(tokenId), ipfsSuffix));
    }

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

    function uint2str(uint256 _i) internal pure returns (string memory _uintAsString) {
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

// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

import "./NFTPotionAuction.sol";
import "./RarityConfigItem.sol";
import "hardhat/console.sol";

contract NFTPotion is ERC721URIStorage, Ownable {
    /**
        Storage
     */
    string public ipfsPrefix;
    string public ipfsSuffix;
    uint256 public numMintedTokens;
    uint256 public maxTokens;
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
    modifier validatePublicKey(bytes calldata publicKey) {
        require(address(uint160(uint256(keccak256(publicKey)))) == _msgSender(), "BPK"); // Bad Public Key
        _;
    }
    modifier checkMaxNFTs() {
        require(numMintedTokens < maxTokens, "TMN"); // Too Many NFTs
        _;
    }

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
        uint256 _maxTokens,
        bytes memory _fullSecret,
        address _whitelist,
        RarityConfigItem[] memory _rarityConfig
    ) ERC721(_tokenName, _tokenSymbol) {
        ipfsPrefix = _ipfsPrefix;
        ipfsSuffix = _ipfsSuffix;
        maxTokens = _maxTokens;
        fullSecret = _fullSecret;
        whitelist = INFTPotionWhitelist(_whitelist);

        for (uint256 i = 0; i < _rarityConfig.length; ++i) {
            rarityConfig.push(_rarityConfig[i]);
        }
    }

    /**
        Mutating functions
     */
    function mint(uint256 tokenId, string calldata publicKey) public checkMaxNFTs checkWhitelist(tokenId) {
        _safeMint(msg.sender, tokenId);

        string memory tokenIdStr = uint2str(tokenId);
        string memory uri = string(abi.encodePacked(ipfsPrefix, tokenIdStr, ipfsSuffix));

        _setTokenURI(tokenId, uri);

        encryptionKeys[tokenId] = publicKey;

        numMintedTokens++;

        emit Mint(tokenId, uri);
    }

    function mintList(uint256[] calldata tokenIds, string calldata publicKey) external {
        for (uint256 i = 0; i < tokenIds.length; ++i) {
            mint(tokenIds[i], publicKey);
        }
    }

    /**
        View functions
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

                // Piece index for batched tokenIDs
                //uint256 numTokens = config.endTokenId - config.startTokenId + 1;
                //uint256 tokensPerPiece = numTokens / fragmentNumPieces;
                //uint256 pieceIndex = (tokenId - config.startTokenId) / tokensPerPiece;

                // Piece index for consecutive tokenIDs
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

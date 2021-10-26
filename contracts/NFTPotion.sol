// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

import "./NFTPotionAuction.sol";

import "hardhat/console.sol";

contract NFTPotion is ERC721URIStorage, Ownable {
    /**
        Storage
     */
    string public ipfsPrefix;
    string public ipfsSuffix;
    uint256 public numMintedTokens;
    uint256 public maxMintedTokens;
    bytes public fullSecret;
    mapping(uint256 => string) public encryptionKeys;
    uint256 public bytesPerSecret;
    INFTPotionWhitelist whitelist;

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
        require(numMintedTokens < maxMintedTokens, "TMN"); // Too Many NFTs
        _;
    }

    modifier checkWhitelist(uint256 tokenId) {
        INFTPotionWhitelist.WhitelistData[] memory ranges = whitelist.getWhitelistRanges(_msgSender());

        for (uint256 i = 0; i < ranges.length; ++i) {
            require(tokenId >= ranges[i].firstId && tokenId <= ranges[i].lastId, "Not whitelisted for token ID");
        }
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
        uint256 _maxMintedTokens,
        bytes memory _fullSecret,
        address _whitelist
    ) ERC721(_tokenName, _tokenSymbol) {
        ipfsPrefix = _ipfsPrefix;
        ipfsSuffix = _ipfsSuffix;
        maxMintedTokens = _maxMintedTokens;
        fullSecret = _fullSecret;
        bytesPerSecret = _fullSecret.length / _maxMintedTokens;
        whitelist = INFTPotionWhitelist(_whitelist);
    }

    /**
        Mutating functions
     */
    function mint(uint256 tokenId, string calldata publicKey) public checkMaxNFTs checkWhitelist(tokenId) {
        _safeMint(msg.sender, tokenId);

        string memory tokenIdStr = uint2str(tokenId);
        string memory tokenURI = string(abi.encodePacked(ipfsPrefix, tokenIdStr, ipfsSuffix));

        _setTokenURI(tokenId, tokenURI);

        encryptionKeys[tokenId] = publicKey;

        numMintedTokens++;

        emit Mint(tokenId, tokenURI);
    }

    function mintList(uint256[] calldata tokenIds, string calldata publicKey) external {
        for (uint256 i = 0; i < tokenIds.length; ++i) {
            mint(tokenIds[i], publicKey);
        }
    }

    /**
        View functions
     */
    function secret(uint256 tokenId) external view returns (bytes memory) {
        if (ownerOf(tokenId) == address(0)) {
            return new bytes(0);
        }

        bytes memory out = new bytes(bytesPerSecret);

        for (uint256 i = 0; i < bytesPerSecret; ++i) {
            out[i] = fullSecret[(tokenId - 1) * bytesPerSecret + i];
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

// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

import "hardhat/console.sol";

contract SVGNFT is ERC721URIStorage, Ownable {
    /**
        Storage
     */
    string public ipfsPrefix;
    string public ipfsSuffix;
    uint256 public nextTokenId = 1;
    uint256 public maxNFT;
    bytes public fullSecret;
    mapping(uint256 => string) public encryptionKeys;
    uint256 public bytesPerSecret;

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
        require(nextTokenId < maxNFT + 1, "TMN"); // Too Many NFTs
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
        uint256 _maxNFT,
        bytes memory _fullSecret
    ) ERC721(_tokenName, _tokenSymbol) {
        ipfsPrefix = _ipfsPrefix;
        ipfsSuffix = _ipfsSuffix;
        maxNFT = _maxNFT;
        fullSecret = _fullSecret;
        bytesPerSecret = _fullSecret.length / _maxNFT;
    }

    /**
        Mutating functions
     */
    function mint(string calldata publicKey) external checkMaxNFTs {
        uint256 tokenId;

        _safeMint(msg.sender, (tokenId = nextTokenId++));

        string memory tokenIdStr = uint2str(tokenId);
        string memory tokenURI = string(abi.encodePacked(ipfsPrefix, tokenIdStr, ipfsSuffix));

        _setTokenURI(tokenId, tokenURI);

        encryptionKeys[tokenId] = publicKey;

        emit Mint(tokenId, tokenURI);
    }

    /**
        View functions
     */
    function secret(uint256 tokenId) external view returns (bytes memory) {
        if (tokenId >= nextTokenId) {
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

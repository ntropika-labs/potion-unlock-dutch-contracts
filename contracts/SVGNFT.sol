// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

import "hardhat/console.sol";

contract SVGNFT is ERC721URIStorage, Ownable {
    /**
        Storage
     */
    uint256 public nextTokenId = 1;
    uint256 public maxNFT;
    bytes private fullSecret; // Although it is private, it is still visible from outside the contract
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
        uint256 _maxNFT,
        bytes memory _fullSecret
    ) ERC721(_tokenName, _tokenSymbol) {
        maxNFT = _maxNFT;
        fullSecret = _fullSecret;
        bytesPerSecret = _fullSecret.length / _maxNFT;
    }

    /**
        Mutating functions
     */
    function mint(string calldata tokenURI, string calldata publicKey) external checkMaxNFTs {
        uint256 tokenId;

        _safeMint(msg.sender, (tokenId = nextTokenId++));

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
}

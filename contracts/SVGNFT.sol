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

    /**
        Events
     */
    event Mint(uint256 indexed tokenId, string tokenURI);

    /**
        Modifiers
    */
    modifier validatePublicKey(bytes calldata publicKey)
    {
        require(address(uint160(uint256(keccak256(publicKey)))) == _msgSender(), "BPK");
        _;
    }
    modifier checkMaxNFTs()
    {
        require(nextTokenId < maxNFT+1, "TMN");
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

    ) ERC721(_tokenName, _tokenSymbol)
    {
        maxNFT = _maxNFT;
        fullSecret = _fullSecret;
    }

    /**
        Mutating functions
     */
    function mint(string calldata tokenURI, bytes calldata publicKey) external checkMaxNFTs() {
        uint256 tokenId;

        _safeMint(msg.sender, (tokenId = nextTokenId++));
        
        _setTokenURI(tokenId, tokenURI);

        emit Mint(tokenId, tokenURI);
    }

    function secret(uint256 tokenId) external view returns (bytes1) 
    {
        if (tokenId >= nextTokenId) {
            return 0x0;
        }
        
        return fullSecret[tokenId%fullSecret.length];
    }
}

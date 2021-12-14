// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./NFTPotionDutchAuction.sol";
import "./RarityConfigItem.sol";

/**
    NFT contract for Potion Unlock
 */
contract NFTPotion is ERC721URIStorage, NFTPotionDutchAuction {
    // Storage
    string public ipfsPrefix;
    string public ipfsSuffix;
    bytes public fullSecret;
    RarityConfigItem[] public rarityConfig;
    uint256[] public rarityNumMinted;
    //mapping(address => uint128[]) public purchasedNFTs;

    struct PurchasedRange {
        uint128 start;
        uint128 length;
    }

    /*struct PurchasedRange {
        uint256 start;
        uint256 length;
    }*/
    mapping(address => PurchasedRange[]) public purchasedNFTs;

    // Events
    event NFTPurchased(
        address indexed buyer,
        uint256 indexed startTokenId,
        uint256 amount,
        uint256 limitPrice,
        string publicKey
    );

    // Modifiers
    modifier checkValidRarity(uint256 rarityId) {
        require(rarityId < rarityConfig.length, "Invalid rarity ID");
        _;
    }

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

        uint256 lastTokenId = 0;
        for (uint256 i = 0; i < _rarityConfig.length; ++i) {
            require(_rarityConfig[i].startTokenId < _rarityConfig[i].endTokenId, "Rarity token ID ranges are invalid");
            require(_rarityConfig[i].startTokenId > lastTokenId, "Rarity token ID ranges are overlapping");

            rarityConfig.push(_rarityConfig[i]);

            lastTokenId = _rarityConfig[i].endTokenId;
        }

        rarityNumMinted = new uint256[](rarityConfig.length);
    }

    // Auction delegates

    /**
        @notice Requests the total number of NFTs to be sold for the given rarity ID

        @param rarityId The rarity IDs of the NFTs to purchase

        @return The total number of NFTs to be sold for the given rarity

        @dev The function must be overriden by the child contract and return the
        number of NFTs to be sold for the given rarity.
     */
    function getRemainingNFTs(uint256 rarityId) public view override checkValidRarity(rarityId) returns (uint256) {
        RarityConfigItem storage rarity = rarityConfig[rarityId];
        uint256 totalTokens = rarity.endTokenId - rarity.startTokenId + 1;
        return totalTokens - rarityNumMinted[rarityId];
    }

    /**
        @notice Mints the number of tokens requested by the caller

        @param rarityId The ID of the rarity config to use
        @param amount The amount of tokens to mint
        @param limitPrice The maximum price the buyer is willing to pay
        @param publicKey The public key of the minter

        @dev The caller is ensuring that the number of tokens requested is less than
        the number of tokens available for minting.
     */
    function _purchaseItems(
        uint256 rarityId,
        uint256 amount,
        uint256 limitPrice,
        string calldata publicKey
    ) internal override checkValidRarity(rarityId) {
        RarityConfigItem storage rarity = rarityConfig[rarityId];
        uint256 numTokensMinted = rarityNumMinted[rarityId];
        uint256 startTokenId = rarity.startTokenId + numTokensMinted;

        for (uint256 i = 0; i < amount; ++i) {
            _safeMint(msg.sender, startTokenId + i);

            //purchasedNFTs[msg.sender].push(uint128(startTokenId + i));
        }

        purchasedNFTs[msg.sender].push(PurchasedRange(uint128(startTokenId), uint128(amount)));
        //purchasedNFTs[msg.sender].push(PurchasedRange(startTokenId, amount));

        rarityNumMinted[rarityId] += amount;

        emit NFTPurchased(_msgSender(), startTokenId, amount, limitPrice, publicKey);
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
        return string(abi.encodePacked(ipfsPrefix, Strings.toString(tokenId), ipfsSuffix));
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
}

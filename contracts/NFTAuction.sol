// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "solidity-linked-list/contracts/StructuredLinkedList.sol";

import "./SVGNFT.sol";

import "hardhat/console.sol";

contract NFTAuction is Context, IStructureInterface {
    using SafeERC20 for IERC20;
    using SafeMath for uint128;
    using StructuredLinkedList for StructuredLinkedList.List;

    ISVGNFT auctioningToken;
    IERC20 biddingToken;

    // Current running auction parameters
    struct BatchData {
        uint256 auctionEndDate;
        uint256 minimumPricePerToken;
        uint256 startTokenId; // Included
        uint256 numTokensAuctioned;
        uint256 highestBid;
        uint64 numBidders;
    }
    StructuredLinkedList.List public bidders;
    BatchData public currentBatch;
    mapping(address => uint64) public biddersAddressId;
    mapping(uint64 => address) public biddersIdAddress;

    // Minting whitelist
    struct WhitelistData {
        uint256 firstId;
        uint256 lastId;
    }
    mapping(address => WhitelistData[]) public whitelist;
    mapping(address => uint256) public refunds;

    constructor(ISVGNFT _auctioningToken, IERC20 _biddingToken) {
        auctioningToken = _auctioningToken;
        biddingToken = _biddingToken;
    }

    function startBatch(
        uint256 startTokenId,
        uint256 endTokenId,
        uint256 minimumPricePerToken,
        uint256 auctionEndDate
    ) public {
        require(auctionEndDate > block.timestamp, "Auction not active");

        currentBatch.startTokenId = startTokenId;
        currentBatch.numTokensAuctioned = endTokenId - startTokenId + 1;
        currentBatch.minimumPricePerToken = minimumPricePerToken;
        currentBatch.auctionEndDate = auctionEndDate;

        delete bidders;
    }

    function bid(uint64 numTokens, uint128 pricePerToken) external {
        require(block.timestamp <= currentBatch.auctionEndDate, "Auction already ended");
        //require(pricePerToken > currentBatch.highestBid, "Bid must be higher");

        //if (biddersIds[_msgSender()] == 0) {
        uint64 bidderId = ++currentBatch.numBidders;

        biddersAddressId[_msgSender()] = bidderId;
        biddersIdAddress[bidderId] = _msgSender();

        //}

        // TODO: consider case when sender re-bids

        currentBatch.highestBid = pricePerToken;

        addBid(bidderId, numTokens, pricePerToken);

        biddingToken.safeTransferFrom(_msgSender(), address(this), pricePerToken.mul(numTokens));
    }

    function endBatch() external {
        //require(block.timestamp > currentBatch.auctionEndDate, "Auction cannot be ended yet");

        (, uint256 node) = bidders.getPreviousNode(0);

        // Whitelisting
        uint256 numAssignedTokens = 0;
        while (node != 0) {
            (uint64 bidderId, uint64 numTokens, uint128 pricePerToken) = decodeBid(node);

            if (numAssignedTokens + numTokens > currentBatch.numTokensAuctioned) {
                uint256 assignedTokens = currentBatch.numTokensAuctioned - numAssignedTokens;

                whitelistBidder(bidderId, assignedTokens, currentBatch.startTokenId + numAssignedTokens);
                refundBidder(bidderId, numTokens - assignedTokens, pricePerToken);
                break;
            } else {
                whitelistBidder(bidderId, numTokens, currentBatch.startTokenId + numAssignedTokens);
                numAssignedTokens += numTokens;
            }
            (, node) = bidders.getPreviousNode(node);
        }

        // Refunds
        while (node != 0) {
            (, node) = bidders.getPreviousNode(node);
            (uint64 bidderId, uint64 numTokens, uint128 pricePerToken) = decodeBid(node);
            refundBidder(bidderId, numTokens, pricePerToken);
        }
    }

    function claim() external {
        if (whitelist[_msgSender()].length > 0) {
            // Process whitelist
        }
        if (refunds[_msgSender()] > 0) {
            biddingToken.safeTransfer(_msgSender(), refunds[_msgSender()]);
        }
    }

    /**
        Internals
     */
    function encodeBid(
        uint64 bidderId,
        uint64 numTokens,
        uint128 pricePerToken
    ) internal pure returns (uint256) {
        return (uint256(pricePerToken) << 128) + (uint256(numTokens) << 64) + uint256(bidderId);
    }

    function decodeBid(uint256 node)
        internal
        pure
        returns (
            uint64 bidderId,
            uint64 numTokens,
            uint128 pricePerToken
        )
    {
        bidderId = uint64((node << 192) >> 192);
        numTokens = uint64((node << 128) >> 192);
        pricePerToken = uint128(node >> 128);
    }

    function addBid(
        uint64 bidderId,
        uint64 numTokens,
        uint128 pricePerToken
    ) internal {
        uint256 node = encodeBid(bidderId, numTokens, pricePerToken);

        require(!bidders.nodeExists(node), "PANIC!! This should not happen!");

        uint256 position = bidders.getSortedSpot(address(this), getValue(node));
        bidders.insertBefore(position, node);
    }

    function whitelistBidder(
        uint64 bidderId,
        uint256 numTokens,
        uint256 firstTokenId
    ) internal {
        WhitelistData memory whitelistData;

        whitelistData.firstId = firstTokenId;
        whitelistData.lastId = firstTokenId + numTokens - 1;

        address bidderAddress = biddersIdAddress[bidderId];
        whitelist[bidderAddress].push(whitelistData);
    }

    function refundBidder(
        uint64 bidderId,
        uint256 numTokens,
        uint128 pricePerToken
    ) internal {
        address bidderAddress = biddersIdAddress[bidderId];
        refunds[bidderAddress] += pricePerToken.mul(numTokens);
    }

    function getValue(uint256 id) public pure returns (uint256) {
        return id >> 128;
    }

    function listBidders() external view {
        (bool exist, uint256 node) = bidders.getPreviousNode(0);

        while (node != 0) {
            (uint64 bidderId, uint64 numTokens, uint128 pricePerToken) = decodeBid(node);
            console.log("Bidder Id: ", uint256(bidderId));
            console.log("Num Tokens: ", uint256(numTokens));
            console.log("Price: ", uint256(pricePerToken));
            (exist, node) = bidders.getPreviousNode(node);
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "solidity-linked-list/contracts/StructuredLinkedList.sol";

import "./SVGNFT.sol";

contract NFTAuction is Context {
    using SafeERC20 for IERC20;
    using SafeMath for uint96;
    using StructuredLinkedList for StructuredLinkedList.List;

    ISVGNFT auctioningToken;
    IERC20 biddingToken;

    // Current running auction parameters
    struct BatchData {
        uint256 auctionEndDate;
        uint256 minimumPricePerToken;
        uint256 startTokenID; // Included
        uint256 endTokenID; // Included
        uint256 highestBid;
        StructuredLinkedList.List bidders;
        uint64 numBidders;
    }

    BatchData currentBatch;
    mapping(address => uint64) private biddersIds;

    // NFTContract => (BuyerAddress => OwnsNFT)
    mapping(address => mapping(address => bool)) whitelist;

    // Allowed withdrawals of previous bids
    mapping(address => uint256) pendingReturns;

    constructor(ISVGNFT _auctioningToken, IERC20 _biddingToken) {
        auctioningToken = _auctioningToken;
        biddingToken = _biddingToken;
    }

    function startBatch(
        uint256 startTokenID,
        uint256 endTokenID,
        uint256 minimumPricePerToken,
        uint256 auctionEndDate
    ) public {
        require(auctionEndDate > block.timestamp, "Auction not active");

        currentBatch.startTokenID = startTokenID;
        currentBatch.endTokenID = endTokenID;
        currentBatch.minimumPricePerToken = minimumPricePerToken;
        currentBatch.auctionEndDate = auctionEndDate;

        delete currentBatch.bidders;
    }

    function bid(uint32 numTokens, uint96 pricePerToken) external {
        require(block.timestamp <= currentBatch.auctionEndDate, "Auction already ended");
        require(pricePerToken > currentBatch.highestBid, "Bid must be higher");

        if (biddersIds[_msgSender()] == 0) {
            biddersIds[_msgSender()] = ++currentBatch.numBidders;
        }

        // TODO: consider case when sender re-bids

        uint64 bidderId = biddersIds[_msgSender()];
        uint256 node = encodeNode(bidderId, numTokens, pricePerToken);

        currentBatch.highestBid = pricePerToken;
        require(!currentBatch.bidders.nodeExists(node), "PANIC!! This should not happen!");

        currentBatch.bidders.pushBack(node);

        biddingToken.safeTransferFrom(_msgSender(), address(this), pricePerToken.mul(numTokens));
    }

    function endBatch() external {
        require(block.timestamp > currentBatch.auctionEndDate, "Auction cannot be ended yet");
    }

    function encodeNode(
        uint64 bidderId,
        uint64 numTokens,
        uint128 pricePerToken
    ) internal pure returns (uint256) {
        return (uint256(bidderId) << 192) + (uint256(numTokens) << 128) + uint256(pricePerToken);
    }

    /// Withdraw a bid that was overbid.
    function claim() public returns (bool) {
        return true;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "solidity-linked-list/contracts/StructuredLinkedList.sol";

import "hardhat/console.sol";

interface INFTPotionWhitelist {
    struct WhitelistData {
        uint256 firstId;
        uint256 lastId;
    }

    function getWhitelistRanges(address buyer) external returns (WhitelistData[] memory);
}

contract NFTPotionAuction is Ownable, INFTPotionWhitelist, IStructureInterface {
    using SafeERC20 for IERC20;
    using StructuredLinkedList for StructuredLinkedList.List;

    IERC20 biddingToken;

    // Current running auction parameters
    struct BatchData {
        uint256 auctionEndDate;
        uint256 minimumPricePerToken;
        uint256 startTokenId; // Included
        uint256 numTokensAuctioned;
        uint256 highestBid;
        uint256 claimableFunds;
        uint64 nextBidderId;
    }
    BatchData public currentBatch;

    // Bidders info
    StructuredLinkedList.List public bidders;
    mapping(address => uint256) public bidByBidder; // bidder -> bid
    mapping(uint64 => address) public bidderById; // bidderId -> bidder
    mapping(address => uint256) public refunds;
    uint256 public claimableFunds;

    // Whitelist
    mapping(address => WhitelistData[]) public whitelist;

    /**
        Modifiers
    */
    modifier checkAuctionActive() {
        require(block.timestamp <= currentBatch.auctionEndDate, "Auction already ended");
        _;
    }

    /**
        Constructor
     */
    constructor(IERC20 _biddingToken) {
        biddingToken = _biddingToken;
    }

    /** 
    Getters
    */
    function getWhitelistRanges(address buyer) external view returns (WhitelistData[] memory) {
        return whitelist[buyer];
    }

    /**
        Auction management
     */
    function startBatch(
        uint256 startTokenId,
        uint256 endTokenId,
        uint256 minimumPricePerToken,
        uint256 auctionEndDate
    ) external onlyOwner {
        require(auctionEndDate > block.timestamp, "Auction not active");

        currentBatch.startTokenId = startTokenId;
        currentBatch.numTokensAuctioned = endTokenId - startTokenId + 1;
        currentBatch.minimumPricePerToken = minimumPricePerToken;
        currentBatch.auctionEndDate = auctionEndDate;

        currentBatch.highestBid = 0;
        currentBatch.claimableFunds = 0;
    }

    function endBatch() external {
        //
        // TODO!! reenable the check
        //
        //require(block.timestamp > currentBatch.auctionEndDate, "Auction cannot be ended yet");

        // Whitelisting
        uint256 numAssignedTokens = 0;
        uint256 numBidders = bidders.size;
        uint256 bidderIndex;
        for (; bidderIndex < numBidders; ++bidderIndex) {
            uint256 node = bidders.popBack();
            (uint64 bidderId, uint64 numTokens, uint128 pricePerToken) = _decodeBid(node);

            // TODO: Refactor this piece of code
            if (numAssignedTokens + numTokens > currentBatch.numTokensAuctioned) {
                uint256 assignedTokens = currentBatch.numTokensAuctioned - numAssignedTokens;

                _whitelistBidder(bidderId, assignedTokens, currentBatch.startTokenId + numAssignedTokens);
                _refundBidder(bidderId, pricePerToken * (numTokens - assignedTokens));
                _cleanBidderInfo(bidderId);
                break;
            } else {
                _whitelistBidder(bidderId, numTokens, currentBatch.startTokenId + numAssignedTokens);
                numAssignedTokens += numTokens;
                _cleanBidderInfo(bidderId);
            }
        }

        // Refunds
        for (; bidderIndex < numBidders; ++bidderIndex) {
            uint256 node = bidders.popBack();
            (uint64 bidderId, uint64 numTokens, uint128 pricePerToken) = _decodeBid(node);
            _refundBidder(bidderId, pricePerToken * numTokens);
            _cleanBidderInfo(bidderId);
        }

        claimableFunds += currentBatch.claimableFunds;

        delete currentBatch;
    }

    /**
        Bid management
     */
    function setBid(uint64 numTokens, uint128 pricePerToken) external checkAuctionActive {
        require(pricePerToken >= currentBatch.minimumPricePerToken, "Bid must reach minimum amount");
        require(pricePerToken > currentBatch.highestBid, "Bid must be higher");

        currentBatch.highestBid = pricePerToken;

        // Cancel previous bid. If there was no previous bid, the _cancelBid
        // will return a new bidderId
        uint64 bidderId = _cancelBid();

        // Add the new bid
        _addBid(bidderId, numTokens, pricePerToken);

        // Charge or refund the bidder
        _chargeBidder(_msgSender(), pricePerToken * numTokens);
    }

    function cancelBid() external checkAuctionActive {
        _cancelBid();
    }

    /**
        Claiming functions
     */
    function claimRefund() public {
        require(refunds[_msgSender()] > 0, "No refund pending");

        uint256 amountToRefund = refunds[_msgSender()];
        refunds[_msgSender()] = 0;

        biddingToken.safeTransfer(_msgSender(), amountToRefund);
    }

    /**
        View functions
    */
    function getLatestBid(address bidder) external view returns (uint64 numTokens, uint128 pricePerToken) {
        (, numTokens, pricePerToken) = _decodeBid(bidByBidder[bidder]);
    }

    /**
        Owner methods
     */
    function transferFunds(address recipient) external onlyOwner {
        biddingToken.safeTransfer(recipient, claimableFunds);
    }

    /**
        Internals
     */
    function _encodeBid(
        uint64 bidderId,
        uint64 numTokens,
        uint128 pricePerToken
    ) internal pure returns (uint256) {
        return (uint256(pricePerToken) << 128) + (uint256(numTokens) << 64) + uint256(bidderId);
    }

    function _decodeBid(uint256 node)
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

    function _addBid(
        uint64 bidderId,
        uint64 numTokens,
        uint128 pricePerToken
    ) internal {
        uint256 node = _encodeBid(bidderId, numTokens, pricePerToken);
        require(!bidders.nodeExists(node), "PANIC!! This should not happen!");

        uint256 position = bidders.getSortedSpot(address(this), getValue(node));
        bidders.insertBefore(position, node);
        bidByBidder[_msgSender()] = node; // bidder -> bid
    }

    function _cancelBid() internal returns (uint64) {
        (uint64 bidderId, uint64 prevNumTokens, uint128 prevPricePerToken, uint256 node) = _getBidInfo(_msgSender());

        if (prevPricePerToken != 0) {
            bidders.remove(node);
            _cleanBidderInfo(bidderId);
            _refundBidder(_msgSender(), prevPricePerToken * prevNumTokens);
        }

        return bidderId;
    }

    function _cleanBidderInfo(uint64 bidderId) internal {
        address bidder = bidderById[bidderId];
        delete bidderById[bidderId];
        delete bidByBidder[bidder];
    }

    function _getBidInfo(address bidder)
        internal
        returns (
            uint64 bidderId,
            uint64 numTokens,
            uint128 pricePerToken,
            uint256 node
        )
    {
        node = bidByBidder[bidder]; // bidder -> bid
        if (node == 0) {
            bidderId = ++currentBatch.nextBidderId;
            bidderById[bidderId] = bidder;
        } else {
            (bidderId, numTokens, pricePerToken) = _decodeBid(node);
        }
    }

    function _whitelistBidder(
        uint64 bidderId,
        uint256 numTokens,
        uint256 firstTokenId
    ) internal {
        WhitelistData memory whitelistData;

        whitelistData.firstId = firstTokenId;
        whitelistData.lastId = firstTokenId + numTokens - 1;

        address bidderAddress = bidderById[bidderId];
        whitelist[bidderAddress].push(whitelistData);
    }

    function _refundBidder(uint64 bidderId, uint256 amount) internal {
        _refundBidder(bidderById[bidderId], amount);
    }

    function _refundBidder(address bidder, uint256 amount) internal {
        refunds[bidder] += amount;
        currentBatch.claimableFunds -= amount;
    }

    function _chargeBidder(address bidder, uint256 amount) internal {
        uint256 credit = refunds[bidder];
        if (credit >= amount) {
            refunds[bidder] -= amount;
        } else {
            refunds[bidder] = 0;
            biddingToken.safeTransferFrom(_msgSender(), address(this), amount - credit);
        }
        currentBatch.claimableFunds += amount;
    }

    /**
        Linked list utility function
     */
    function getValue(uint256 id) public pure returns (uint256) {
        return id >> 128;
    }

    function listBidders() external view {
        (bool exist, uint256 node) = bidders.getPreviousNode(0);

        while (node != 0) {
            (uint64 bidderId, uint64 numTokens, uint128 pricePerToken) = _decodeBid(node);
            console.log("Bidder Id: ", uint256(bidderId));
            console.log("Num Tokens: ", uint256(numTokens));
            console.log("Price: ", uint256(pricePerToken));
            (exist, node) = bidders.getPreviousNode(node);
        }
    }
}

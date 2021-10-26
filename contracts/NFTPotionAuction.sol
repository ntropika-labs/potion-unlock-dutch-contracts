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
        require(auctionEndDate > block.timestamp, "Auction is in the past");

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
        while (bidders.size > 0 && numAssignedTokens < currentBatch.numTokensAuctioned) {
            uint256 node = bidders.popBack();
            (uint64 bidderId, uint64 numTokens, uint128 pricePerToken) = _decodeBid(node);

            uint256 assignedTokens;
            if (numAssignedTokens + numTokens > currentBatch.numTokensAuctioned) {
                assignedTokens = currentBatch.numTokensAuctioned - numAssignedTokens;
                console.log("Assign+Refund tokens");
            } else {
                assignedTokens = numTokens;
                console.log("Assign tokens");
            }

            console.log("Bidder Id: ", uint256(bidderId));
            console.log("Num Tokens: ", uint256(numTokens));
            console.log("Price: ", uint256(pricePerToken));

            _whitelistBidder(bidderId, assignedTokens, currentBatch.startTokenId + numAssignedTokens);
            numAssignedTokens += assignedTokens;

            if (assignedTokens != numTokens) {
                console.log("[REFUND]");
                _refundBidder(bidderId, pricePerToken * (numTokens - assignedTokens));
            }

            _cleanBidderInfo(bidderId);
        }

        // Refunds
        console.log("Only refund: ", uint256(bidders.size));
        while (bidders.size > 0) {
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

        uint64 bidderId = _cancelBid();
        if (bidderId == 0) {
            bidderId = ++currentBatch.nextBidderId;
            bidderById[bidderId] = _msgSender();
        }

        _addBid(bidderId, numTokens, pricePerToken);
        _chargeBidder(pricePerToken * numTokens);
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
        claimableFunds = 0;
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

        if (node != 0) {
            bidders.remove(node);
            delete bidByBidder[_msgSender()];
            _refundBidder(_msgSender(), prevPricePerToken * prevNumTokens);
        }

        return bidderId;
    }

    function _cleanBidderInfo(uint64 bidderId) internal {
        address bidder = bidderById[bidderId];
        delete bidByBidder[bidder];
        delete bidderById[bidderId];
    }

    function _getBidInfo(address bidder)
        internal
        view
        returns (
            uint64 bidderId,
            uint64 numTokens,
            uint128 pricePerToken,
            uint256 node
        )
    {
        node = bidByBidder[bidder]; // bidder -> bid
        if (node != 0) {
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

    function _chargeBidder(uint256 amount) internal {
        uint256 credit = refunds[_msgSender()];
        if (credit >= amount) {
            refunds[_msgSender()] -= amount;
        } else {
            refunds[_msgSender()] = 0;
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

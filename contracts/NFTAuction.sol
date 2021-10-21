// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "solidity-linked-list/contracts/StructuredLinkedList.sol";

import "hardhat/console.sol";

contract NFTAuction is Context, IStructureInterface {
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
        uint64 numBidders;
    }
    StructuredLinkedList.List public bidders;
    BatchData public currentBatch;
    mapping(address => uint256) public biddersAddressBid;
    mapping(uint64 => address) public biddersIdAddress;

    // Minting whitelist
    struct WhitelistData {
        uint256 firstId;
        uint256 lastId;
    }
    mapping(address => WhitelistData[]) public whitelist;
    mapping(address => uint256) public refunds;

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
        Auction management
     */
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
    }

    function endBatch() external {
        //
        // TODO!! reenable the check
        //

        //require(block.timestamp > currentBatch.auctionEndDate, "Auction cannot be ended yet");

        (, uint256 node) = bidders.getPreviousNode(0);

        // Whitelisting
        uint256 numAssignedTokens = 0;
        while (node != 0) {
            (uint64 bidderId, uint64 numTokens, uint128 pricePerToken) = _decodeBid(node);

            if (numAssignedTokens + numTokens > currentBatch.numTokensAuctioned) {
                uint256 assignedTokens = currentBatch.numTokensAuctioned - numAssignedTokens;

                _whitelistBidder(bidderId, assignedTokens, currentBatch.startTokenId + numAssignedTokens);
                _refundBidder(bidderId, pricePerToken * (numTokens - assignedTokens));
                break;
            } else {
                _whitelistBidder(bidderId, numTokens, currentBatch.startTokenId + numAssignedTokens);
                numAssignedTokens += numTokens;
            }
            (, node) = bidders.getPreviousNode(node);
        }

        // Refunds
        while (node != 0) {
            (, node) = bidders.getPreviousNode(node);
            (uint64 bidderId, uint64 numTokens, uint128 pricePerToken) = _decodeBid(node);
            _refundBidder(bidderId, pricePerToken * numTokens);
        }

        delete bidders;
    }

    /**
        Bid management
     */
    function setBid(uint64 numTokens, uint128 pricePerToken) external checkAuctionActive {
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
        biddersAddressBid[_msgSender()] = node;
    }

    function _cancelBid() internal returns (uint64) {
        (uint64 bidderId, uint64 prevNumTokens, uint128 prevPricePerToken) = _getBidInfo(_msgSender());

        if (prevPricePerToken != 0) {
            _removeBid(_msgSender());
            _refundBidder(_msgSender(), prevPricePerToken * prevNumTokens);
        }

        return bidderId;
    }

    function _removeBid(address bidder) internal {
        bidders.remove(biddersAddressBid[bidder]);
        biddersAddressBid[bidder] = 0;
    }

    function _getBidInfo(address bidder)
        internal
        returns (
            uint64 bidderId,
            uint64 numTokens,
            uint128 pricePerToken
        )
    {
        uint256 bid = biddersAddressBid[bidder];
        if (bid == 0) {
            bidderId = ++currentBatch.numBidders;
            biddersIdAddress[bidderId] = bidder;
        } else {
            (bidderId, numTokens, pricePerToken) = _decodeBid(bid);
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

        address bidderAddress = biddersIdAddress[bidderId];
        whitelist[bidderAddress].push(whitelistData);
    }

    function _refundBidder(uint64 bidderId, uint256 amount) internal {
        _refundBidder(biddersIdAddress[bidderId], amount);
    }

    function _refundBidder(address bidder, uint256 amount) internal {
        refunds[bidder] += amount;
    }

    function _chargeBidder(address bidder, uint256 amount) internal {
        uint256 credit = refunds[bidder];
        if (credit >= amount) {
            refunds[bidder] -= amount;
        } else {
            refunds[bidder] = 0;
            biddingToken.safeTransferFrom(_msgSender(), address(this), amount - credit);
        }
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

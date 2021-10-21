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
            (uint64 bidderId, uint64 numTokens, uint128 pricePerToken) = decodeBid(node);

            if (numAssignedTokens + numTokens > currentBatch.numTokensAuctioned) {
                uint256 assignedTokens = currentBatch.numTokensAuctioned - numAssignedTokens;

                whitelistBidder(bidderId, assignedTokens, currentBatch.startTokenId + numAssignedTokens);
                refundBidder(bidderId, pricePerToken * (numTokens - assignedTokens));
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
            refundBidder(bidderId, pricePerToken * numTokens);
        }

        delete bidders;
    }

    /**
        Bid management
     */
    function setBid(uint64 numTokens, uint128 pricePerToken) external checkAuctionActive {
        require(pricePerToken > currentBatch.highestBid, "Bid must be higher");

        currentBatch.highestBid = pricePerToken;

        // Get previous bid info, in case the bidder already bid
        uint256 prevPaidAmount;
        (uint64 bidderId, uint64 prevNumTokens, uint128 prevPricePerToken) = getBidInfo(_msgSender());
        if (prevPricePerToken != 0) {
            prevPaidAmount = prevPricePerToken * prevNumTokens;
            bidders.remove(biddersAddressBid[_msgSender()]);
        }

        // Add the new bid
        uint256 node = encodeBid(bidderId, numTokens, pricePerToken);
        require(!bidders.nodeExists(node), "PANIC!! This should not happen!");

        uint256 position = bidders.getSortedSpot(address(this), getValue(node));
        bidders.insertBefore(position, node);
        biddersAddressBid[_msgSender()] = node;

        // Charge or refund the bidder
        uint256 amountToPay = pricePerToken * numTokens;
        if (amountToPay > prevPaidAmount) {
            biddingToken.safeTransferFrom(_msgSender(), address(this), amountToPay - prevPaidAmount);
        } else {
            refunds[_msgSender()] += (prevPaidAmount - amountToPay);
        }
    }

    function cancelBid() external checkAuctionActive {
        require(biddersAddressBid[_msgSender()] != 0, "Bidder has no active bids");

        (, uint64 prevNumTokens, uint128 prevPricePerToken) = getBidInfo(_msgSender());

        uint256 prevPaidAmount = prevPricePerToken * prevNumTokens;
        bidders.remove(biddersAddressBid[_msgSender()]);
        biddersAddressBid[_msgSender()] = 0;

        refundBidder(_msgSender(), prevPaidAmount);
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

    function getBidInfo(address bidder)
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
            (bidderId, numTokens, pricePerToken) = decodeBid(bid);
        }
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

    function refundBidder(uint64 bidderId, uint256 amount) internal {
        refundBidder(biddersIdAddress[bidderId], amount);
    }

    function refundBidder(address bidder, uint256 amount) internal {
        refunds[bidder] += amount;
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

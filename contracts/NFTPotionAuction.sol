// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "solidity-linked-list/contracts/StructuredLinkedList.sol";

import "./INFTPotionWhitelist.sol";
import "hardhat/console.sol";

contract NFTPotionAuction is Ownable, INFTPotionWhitelist, IStructureInterface {
    using SafeERC20 for IERC20;
    using StructuredLinkedList for StructuredLinkedList.List;

    IERC20 biddingToken;

    // Current running auction parameters
    struct BatchData {
        uint256 auctionEndDate;
        uint256 minimumPricePerToken;
        uint256 directPurchasePrice;
        uint256 startTokenId; // Included
        uint256 numTokensAuctioned;
        uint256 claimableFunds;
        uint64 nextBidderId;
    }
    BatchData public currentBatch;

    uint256 public lastAuctionedTokenId;
    struct BidData {
        uint64 bidderId;
        address bidderAddress;
        uint64 numTokens;
        uint128 pricePerToken;
    }

    // Bidders info
    StructuredLinkedList.List public bidders;
    mapping(address => uint256) public bidByBidder; // bidder -> bid
    mapping(uint64 => address) public bidderById; // bidderId -> bidder
    mapping(address => uint256) public refunds;
    uint256 public claimableFunds;

    // Whitelist
    mapping(address => WhitelistData[]) public whitelist;

    /**
        Events
     */
    event SetBid(address indexed bidder, uint64 indexed numTokens, uint128 indexed pricePerToken);
    event CancelBid(address indexed bidder);
    event Purchase(address indexed bidder, uint64 indexed numTokens, uint256 indexed pricePerToken);

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
        uint256 directPurchasePrice,
        uint256 auctionEndDate
    ) external onlyOwner {
        require(auctionEndDate > block.timestamp, "Auction is in the past");
        require(startTokenId == lastAuctionedTokenId + 1, "Wrong start token ID");
        require(minimumPricePerToken <= directPurchasePrice, "Minimum higher than purchase price");

        currentBatch.startTokenId = startTokenId;
        currentBatch.numTokensAuctioned = endTokenId - startTokenId + 1;
        currentBatch.minimumPricePerToken = minimumPricePerToken;
        currentBatch.directPurchasePrice = directPurchasePrice;
        currentBatch.auctionEndDate = auctionEndDate;

        currentBatch.claimableFunds = 0;
    }

    function endBatch() external {
        require(
            block.timestamp > currentBatch.auctionEndDate || currentBatch.numTokensAuctioned == 0,
            "Auction cannot be ended yet"
        );

        // Whitelisting
        uint256 numAssignedTokens = 0;
        while (bidders.sizeOf() > 0 && numAssignedTokens < currentBatch.numTokensAuctioned) {
            uint256 node = bidders.popBack();
            (uint64 bidderId, uint64 numTokens, uint128 pricePerToken) = _decodeBid(node);

            uint256 assignedTokens;
            if (numAssignedTokens + numTokens > currentBatch.numTokensAuctioned) {
                assignedTokens = currentBatch.numTokensAuctioned - numAssignedTokens;
            } else {
                assignedTokens = numTokens;
            }

            address bidder = bidderById[bidderId];

            _whitelistBidder(bidder, assignedTokens, currentBatch.startTokenId + numAssignedTokens);
            numAssignedTokens += assignedTokens;

            if (assignedTokens != numTokens) {
                _refundBidder(bidder, pricePerToken * (numTokens - assignedTokens));
            }

            _cleanBidderInfo(bidderId);
        }

        // Refunds
        while (bidders.sizeOf() > 0) {
            uint256 node = bidders.popBack();
            (uint64 bidderId, uint64 numTokens, uint128 pricePerToken) = _decodeBid(node);
            address bidder = bidderById[bidderId];
            _refundBidder(bidder, pricePerToken * numTokens);
            _cleanBidderInfo(bidderId);
        }

        claimableFunds += currentBatch.claimableFunds;
        lastAuctionedTokenId += numAssignedTokens;

        delete currentBatch;
    }

    /**
        Bid management
     */
    function setBid(uint64 numTokens, uint128 pricePerToken) external checkAuctionActive {
        require(pricePerToken >= currentBatch.minimumPricePerToken, "Bid must reach minimum amount");
        require(pricePerToken < currentBatch.directPurchasePrice, "Bid cannot be higher than direct price");

        uint64 bidderId = _cancelBid();
        if (bidderId == 0) {
            bidderId = ++currentBatch.nextBidderId;
            bidderById[bidderId] = _msgSender();
        }

        _addBid(bidderId, numTokens, pricePerToken);
        _chargeBidder(pricePerToken * numTokens);

        emit SetBid(_msgSender(), numTokens, pricePerToken);
    }

    function cancelBid() external checkAuctionActive {
        _cancelBid();

        emit CancelBid(_msgSender());
    }

    /**
        Direct purchase
     */
    function purchase(uint64 numTokens) external checkAuctionActive {
        require(numTokens <= currentBatch.numTokensAuctioned, "Too many tokens for direct purchase");

        _whitelistBidder(_msgSender(), numTokens, currentBatch.startTokenId);

        currentBatch.numTokensAuctioned -= numTokens;
        currentBatch.startTokenId += numTokens;
        lastAuctionedTokenId += numTokens;

        _chargeBidder(currentBatch.directPurchasePrice * numTokens);

        emit Purchase(_msgSender(), numTokens, currentBatch.directPurchasePrice);
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

    function getAllBids() external view returns (BidData[] memory bids) {
        bids = new BidData[](bidders.sizeOf());

        (, uint256 node) = bidders.getPreviousNode(0);
        for (uint256 i = 0; i < bidders.sizeOf(); ++i) {
            (bids[i].bidderId, bids[i].numTokens, bids[i].pricePerToken) = _decodeBid(node);
            bids[i].bidderAddress = bidderById[bids[i].bidderId];

            (, node) = bidders.getPreviousNode(node);
        }
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
        address bidder,
        uint256 numTokens,
        uint256 firstTokenId
    ) internal {
        WhitelistData memory whitelistData;

        whitelistData.firstId = firstTokenId;
        whitelistData.lastId = firstTokenId + numTokens - 1;

        whitelist[bidder].push(whitelistData);
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
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "solidity-linked-list/contracts/StructuredLinkedList.sol";

import "./INFTPotionWhitelist.sol";

contract NFTPotionAuction is Ownable, INFTPotionWhitelist, IStructureInterface {
    using SafeERC20 for IERC20;
    using StructuredLinkedList for StructuredLinkedList.List;

    // Current running auction parameters
    struct BatchData {
        uint128 minimumPricePerToken;
        uint128 directPurchasePrice;
        uint64 startTokenId;
        uint64 numTokensAuctioned;
        uint128 auctionEndDate;
    }
    BatchData public currentBatch;
    uint64 public nextFreeTokenId;
    uint64 private nextBatchStartBidId;
    uint64 private currentBidId;

    struct BidData {
        uint64 bidId;
        address bidderAddress;
        uint64 numTokens;
        uint128 pricePerToken;
    }

    // Bidders info
    StructuredLinkedList.List public bidders;
    mapping(address => uint256) public bidByBidder; // bidder -> bid
    mapping(uint64 => address) public bidderById; // bidId -> bidder
    mapping(address => uint256) public refunds;
    uint256 public claimableFunds;

    // Whitelist
    mapping(address => WhitelistData[]) public whitelist;

    /**
        Events
     */
    event BatchStarted(
        uint256 indexed startTimestamp,
        uint64 indexed startTokenId,
        uint64 indexed endTokenId,
        uint128 minimumPricePerToken,
        uint128 directPurchasePrice,
        uint128 auctionEndDate
    );
    event BatchEnded(uint256 indexed auctionEndTimestamp, uint256 indexed actualEndTimestamp, uint64 numTokensSold);
    event SetBid(address indexed bidder, uint64 indexed numTokens, uint128 indexed pricePerToken);
    event CancelBid(address indexed bidder, uint256 indexed cancelTimestamp, uint256 indexed auctionEndTimestamp);
    event Purchase(address indexed bidder, uint64 indexed numTokens, uint128 indexed pricePerToken);

    /**
        Modifiers
    */
    modifier checkAuctionActive() {
        require(block.timestamp <= currentBatch.auctionEndDate, "Auction already ended");
        _;
    }

    modifier checkAuctionInactive() {
        require(block.timestamp > currentBatch.auctionEndDate, "Auction still active");
        _;
    }

    /**
        Constructor
     */
    constructor() {
        nextFreeTokenId = 1;
        nextBatchStartBidId = 1;
    }

    /**
        Auction management
     */
    function startBatch(
        uint64 startTokenId,
        uint64 endTokenId,
        uint128 minimumPricePerToken,
        uint128 directPurchasePrice,
        uint128 auctionEndDate
    ) external onlyOwner {
        require(auctionEndDate > block.timestamp, "Auction is in the past");
        require(startTokenId == nextFreeTokenId, "Wrong start token ID");
        require(minimumPricePerToken <= directPurchasePrice, "Minimum higher than purchase price");

        currentBatch.startTokenId = startTokenId;
        currentBatch.numTokensAuctioned = endTokenId - startTokenId + 1;
        currentBatch.minimumPricePerToken = minimumPricePerToken;
        currentBatch.directPurchasePrice = directPurchasePrice;
        currentBatch.auctionEndDate = auctionEndDate;

        emit BatchStarted(
            block.timestamp,
            startTokenId,
            endTokenId,
            minimumPricePerToken,
            directPurchasePrice,
            auctionEndDate
        );
    }

    function endBatch() external {
        require(
            block.timestamp > currentBatch.auctionEndDate || currentBatch.numTokensAuctioned == 0,
            "Auction cannot be ended yet"
        );

        // Whitelisting
        uint256 node = bidders.popBack();
        while (node != 0 && currentBatch.numTokensAuctioned > 0) {
            (uint64 bidId, uint64 numRequestedTokens, uint128 pricePerToken) = _decodeBid(node);

            if (numRequestedTokens > currentBatch.numTokensAuctioned) {
                numRequestedTokens = currentBatch.numTokensAuctioned;
            }

            address bidder = bidderById[bidId];

            _cancelBid(bidder);
            _purchase(bidder, numRequestedTokens, pricePerToken);

            node = bidders.popBack();
        }

        nextBatchStartBidId = currentBidId + 1;

        emit BatchEnded(currentBatch.auctionEndDate, block.timestamp, nextFreeTokenId - currentBatch.startTokenId);

        delete bidders;
        delete currentBatch;
    }

    /**
        Bid management
     */
    function setBid(uint64 numTokens, uint128 pricePerToken) external payable checkAuctionActive {
        require(pricePerToken >= currentBatch.minimumPricePerToken, "Bid must reach minimum amount");
        require(pricePerToken < currentBatch.directPurchasePrice, "Bid cannot be higher than direct price");

        address bidder = _msgSender();

        _cancelBid(bidder);
        _addBid(bidder, numTokens, pricePerToken);
        _chargeBidder(bidder, pricePerToken * numTokens, false);

        emit SetBid(bidder, numTokens, pricePerToken);
    }

    function cancelBid() external {
        _cancelBid(_msgSender());

        emit CancelBid(_msgSender(), block.timestamp, currentBatch.auctionEndDate);
    }

    /**
        Direct purchase
     */
    function purchase(uint64 numTokens) external checkAuctionActive {
        require(numTokens <= currentBatch.numTokensAuctioned, "Too many tokens for direct purchase");

        _purchase(_msgSender(), numTokens, currentBatch.directPurchasePrice);

        emit Purchase(_msgSender(), numTokens, currentBatch.directPurchasePrice);
    }

    /**
        Claiming functions
     */
    function claimRefund() public {
        address bidder = _msgSender();

        (, uint64 numTokens, uint128 pricePerToken) = _decodeBid(bidByBidder[bidder]);

        uint256 lockedFunds = numTokens * pricePerToken;
        uint256 amountToRefund = refunds[bidder] - lockedFunds;

        refunds[bidder] = lockedFunds;

        require(amountToRefund > 0, "No refund pending");

        Address.sendValue(payable(bidder), amountToRefund);
    }

    /**
        View functions
    */
    function getWhitelistRanges(address buyer) external view returns (WhitelistData[] memory) {
        return whitelist[buyer];
    }

    function getLatestBid(address bidder)
        external
        view
        returns (
            bool valid,
            uint64 numTokens,
            uint128 pricePerToken
        )
    {
        uint64 bidId;
        (bidId, numTokens, pricePerToken) = _decodeBid(bidByBidder[bidder]);
        valid = bidId >= nextBatchStartBidId;
    }

    function getAllBids() external view returns (BidData[] memory bids) {
        bids = new BidData[](bidders.sizeOf());

        (, uint256 node) = bidders.getPreviousNode(0);
        for (uint256 i = 0; i < bidders.sizeOf(); ++i) {
            (bids[i].bidId, bids[i].numTokens, bids[i].pricePerToken) = _decodeBid(node);
            bids[i].bidderAddress = bidderById[bids[i].bidId];

            (, node) = bidders.getPreviousNode(node);
        }
    }

    /**
        Owner methods
     */
    function whitelistBidder(
        address bidder,
        uint64[] calldata numTokensList,
        uint64[] calldata firstTokenIdList
    ) external onlyOwner checkAuctionInactive {
        require(numTokensList.length == firstTokenIdList.length, "Mismatch in array size for direct whitelist");
        for (uint256 i = 0; i < numTokensList.length; ++i) {
            require(firstTokenIdList[i] == nextFreeTokenId, "Cannot have gaps when whitelisting");

            _whitelistBidder(bidder, numTokensList[i], firstTokenIdList[i]);
        }
    }

    function transferFunds(address payable recipient) external onlyOwner {
        uint256 transferAmount = claimableFunds;
        claimableFunds = 0;
        Address.sendValue(recipient, transferAmount);
    }

    /**
        Internals
     */
    function _encodeBid(
        uint64 bidId,
        uint64 numTokens,
        uint128 pricePerToken
    ) internal pure returns (uint256) {
        return (uint256(pricePerToken) << 128) + (uint256(numTokens) << 64) + uint256(bidId);
    }

    function _decodeBid(uint256 node)
        internal
        pure
        returns (
            uint64 bidId,
            uint64 numTokens,
            uint128 pricePerToken
        )
    {
        bidId = uint64((node << 192) >> 192);
        numTokens = uint64((node << 128) >> 192);
        pricePerToken = uint128(node >> 128);
    }

    function _addBid(
        address bidder,
        uint64 numTokens,
        uint128 pricePerToken
    ) internal {
        uint64 bidId = ++currentBidId;

        uint256 node = _encodeBid(bidId, numTokens, pricePerToken);
        require(!bidders.nodeExists(node), "PANIC!! This should not happen!");

        uint256 position = bidders.getSortedSpot(address(this), getValue(node));
        bidders.insertBefore(position, node);
        bidByBidder[bidder] = node;
        bidderById[bidId] = bidder;
    }

    function _cancelBid(address bidder) internal {
        (uint64 bidId, , , uint256 node) = _getBidInfo(bidder);
        if (node != 0) {
            bidders.remove(node);
            delete bidderById[bidId];
            delete bidByBidder[bidder];
        }
    }

    function _cleanBidderInfo(uint64 bidId) internal {
        address bidder = bidderById[bidId];
        delete bidByBidder[bidder];
        delete bidderById[bidId];
    }

    function _getBidInfo(address bidder)
        internal
        view
        returns (
            uint64 bidId,
            uint64 numTokens,
            uint128 pricePerToken,
            uint256 node
        )
    {
        node = bidByBidder[bidder]; // bidder -> bid
        if (node != 0 && bidders.nodeExists(node)) {
            (bidId, numTokens, pricePerToken) = _decodeBid(node);
        }
    }

    function _whitelistBidder(
        address bidder,
        uint64 numTokens,
        uint64 firstTokenId
    ) internal {
        WhitelistData memory whitelistData;

        whitelistData.firstId = firstTokenId;
        whitelistData.lastId = firstTokenId + numTokens - 1;

        whitelist[bidder].push(whitelistData);

        nextFreeTokenId += numTokens;
    }

    function _purchase(
        address bidder,
        uint64 numTokens,
        uint128 pricePerToken
    ) internal {
        currentBatch.numTokensAuctioned -= numTokens;

        _whitelistBidder(bidder, numTokens, nextFreeTokenId);
        _chargeBidder(bidder, pricePerToken * numTokens, true);
    }

    function _refundBidder(address bidder, uint256 amount) internal {
        refunds[bidder] += amount;
    }

    function _chargeBidder(
        address bidder,
        uint256 amount,
        bool lockFunds
    ) internal {
        uint256 credit = refunds[bidder];

        if (lockFunds) {
            claimableFunds += amount;
        }

        if (credit < amount) {
            require(msg.value == (amount - credit), "Sent incorrect amount of cash");
            refunds[bidder] = lockFunds ? 0 : amount;
        } else if (lockFunds) {
            refunds[bidder] -= amount;
        }
    }

    /**
        Linked list utility function
     */
    function getValue(uint256 id) public pure returns (uint256) {
        return id >> 128;
    }
}

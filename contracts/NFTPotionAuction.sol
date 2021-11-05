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

    struct BatchState {
        uint128 minimumPricePerToken;
        uint128 directPurchasePrice;
        uint64 startTokenId;
        uint64 numTokensAuctioned;
        uint128 auctionEndDate;
        uint128 clearingPrice;
        uint64 lastBidderNumAssignedTokens;
    }
    struct Batch {
        BatchState parameters;
        StructuredLinkedList.List bidders;
        mapping(address => uint256) bidByBidder;
        uint64 currentBidId;
    }

    struct Bid {
        address bidder;
        uint64 bidId;
        uint64 numTokens;
        uint128 pricePerToken;
    }

    mapping(uint256 => Batch) internal batches; // batchId -> batchState
    uint256 public currentBatchId = 1;
    uint64 public nextFreeTokenId = 1;

    // Global bidders info
    mapping(uint64 => address) public bidderById; // bidId -> bidder
    mapping(address => uint256) public refunds;

    // Global funds info
    uint256 public claimableFunds;

    // Whitelist
    mapping(address => WhitelistData[]) public whitelist;

    /**
        Events
     */
    event BatchStarted(
        uint256 indexed batchId,
        uint256 indexed startTimestamp,
        uint64 indexed startTokenId,
        uint64 endTokenId,
        uint128 minimumPricePerToken,
        uint128 directPurchasePrice,
        uint128 auctionEndDate
    );
    event BatchEnded(
        uint256 indexed batchId,
        uint256 indexed auctionEndTimestamp,
        uint256 indexed actualEndTimestamp,
        uint64 numTokensSold
    );
    event SetBid(uint256 indexed batchId, address indexed bidder, uint64 numTokens, uint128 pricePerToken);
    event CancelBid(
        uint256 indexed batchId,
        address indexed bidder,
        uint256 cancelTimestamp,
        uint256 auctionEndTimestamp
    );
    event Purchase(uint256 indexed batchId, address indexed bidder, uint64 numTokens, uint128 pricePerToken);

    /**
        Modifiers
    */
    modifier checkAuctionActive() {
        require(block.timestamp <= _getBatchState(currentBatchId).auctionEndDate, "Auction already ended");
        _;
    }

    modifier checkAuctionInactive() {
        require(block.timestamp > _getBatchState(currentBatchId).auctionEndDate, "Auction still active");
        _;
    }

    /**
        Constructor
     */
    constructor() {}

    /**
        Auction management
     */
    function startBatch(
        uint64 startTokenId,
        uint64 endTokenId,
        uint128 minimumPricePerToken,
        uint128 directPurchasePrice,
        uint128 auctionEndDate
    ) external onlyOwner checkAuctionInactive {
        require(auctionEndDate > block.timestamp, "Auction is in the past");
        require(startTokenId == nextFreeTokenId, "Wrong start token ID");
        require(minimumPricePerToken <= directPurchasePrice, "Minimum higher than purchase price");

        BatchState storage batchState = _getBatchState(currentBatchId);

        batchState.startTokenId = startTokenId;
        batchState.numTokensAuctioned = endTokenId - startTokenId + 1;
        batchState.minimumPricePerToken = minimumPricePerToken;
        batchState.directPurchasePrice = directPurchasePrice;
        batchState.auctionEndDate = auctionEndDate;
        batchState.clearingPrice = type(uint128).max;

        emit BatchStarted(
            currentBatchId,
            block.timestamp,
            startTokenId,
            endTokenId,
            minimumPricePerToken,
            directPurchasePrice,
            auctionEndDate
        );
    }

    function endBatch(uint256 numBidsToProcess) external {
        BatchState storage batchState = _getBatchState(currentBatchId);

        require(batchState.auctionEndDate != 0, "Auction has not been started yet");
        /*require(
            block.timestamp > batchState.auctionEndDate || batchState.numTokensAuctioned == 0,
            "Auction cannot be ended yet"
        );*/

        StructuredLinkedList.List storage bidders = _getBatchBidders(currentBatchId);
        (bool isBidValid, uint256 bid) = bidders.getPreviousNode(0);

        while (numBidsToProcess > 0 && isBidValid && batchState.numTokensAuctioned > 0) {
            (, uint64 numRequestedTokens, uint128 pricePerToken) = _decodeBid(bid);

            if (numRequestedTokens > batchState.numTokensAuctioned) {
                numRequestedTokens = batchState.numTokensAuctioned;
                batchState.lastBidderNumAssignedTokens = batchState.numTokensAuctioned;
                batchState.clearingPrice = pricePerToken;
            }

            claimableFunds += numRequestedTokens * pricePerToken;
            batchState.numTokensAuctioned -= numRequestedTokens;
            numBidsToProcess--;

            (isBidValid, bid) = bidders.getPreviousNode(bid);
        }

        if (batchState.numTokensAuctioned == 0) {
            // Clearing price has been fully calculated
            currentBatchId++;

            emit BatchEnded(
                currentBatchId,
                batchState.auctionEndDate,
                block.timestamp,
                nextFreeTokenId - batchState.startTokenId
            );
        }
    }

    /**
        Bid management
     */
    function setBid(uint64 numTokens, uint128 pricePerToken) external payable checkAuctionActive {
        BatchState storage batchState = _getBatchState(currentBatchId);

        require(pricePerToken >= batchState.minimumPricePerToken, "Bid must reach minimum amount");
        require(pricePerToken < batchState.directPurchasePrice, "Bid cannot be higher than direct price");

        address bidder = _msgSender();

        _cancelBid(currentBatchId, bidder, true);
        _addBid(currentBatchId, bidder, numTokens, pricePerToken);
        _chargeBidder(bidder, pricePerToken * numTokens);

        emit SetBid(currentBatchId, bidder, numTokens, pricePerToken);
    }

    function cancelBid(uint256 batchId, bool alsoRefund) external {
        address bidder = _msgSender();

        _cancelBid(batchId, bidder, true);

        if (alsoRefund) {
            _claimRefund(bidder);
        }
        emit CancelBid(batchId, bidder, block.timestamp, _getBatchState(batchId).auctionEndDate);
    }

    /**
        Direct purchase
     */
    function purchase(uint64 numTokens) external payable checkAuctionActive {
        BatchState storage batchState = _getBatchState(currentBatchId);

        require(numTokens <= batchState.numTokensAuctioned, "Too many tokens for direct purchase");

        _purchase(currentBatchId, _msgSender(), numTokens, batchState.directPurchasePrice);

        emit Purchase(currentBatchId, _msgSender(), numTokens, batchState.directPurchasePrice);
    }

    /**
        Claiming functions
    */
    function claimTokenIds(uint256 batchId, bool alsoRefund) external {
        BatchState storage batchState = _getBatchState(batchId);
        address bidder = _msgSender();

        uint256 bid = _getBatchBidByBidder(batchId, bidder);
        require(bid != 0, "Bidder has no claimable bid");

        (, uint64 numTokens, uint128 pricePerToken) = _decodeBid(bid);

        if (pricePerToken == batchState.clearingPrice) {
            _whitelistBidder(bidder, batchState.lastBidderNumAssignedTokens, nextFreeTokenId);
        } else if (pricePerToken > batchState.clearingPrice) {
            _whitelistBidder(bidder, numTokens, nextFreeTokenId);
        }

        _cancelBid(batchId, bidder, false);

        if (alsoRefund) {
            _claimRefund(_msgSender());
        }
    }

    function claimRefund() external {
        require(refunds[_msgSender()] > 0, "No refundable cash");
        _claimRefund(_msgSender());
    }

    /**
        View functions
    */
    function getCurrentBatch() external view returns (BatchState memory) {
        return _getBatchState(currentBatchId);
    }

    function getBatch(uint256 batchId) external view returns (BatchState memory) {
        return _getBatchState(batchId);
    }

    function getWhitelistRanges(address buyer) external view returns (WhitelistData[] memory) {
        return whitelist[buyer];
    }

    function getLatestBid(uint256 batchId, address bidder) public view returns (Bid memory bid) {
        uint256 encodedBid = _getBatchBidByBidder(batchId, bidder);
        bid.bidder = bidder;
        (bid.bidId, bid.numTokens, bid.pricePerToken) = _decodeBid(encodedBid);
    }

    function getAllBids() external view returns (Bid[] memory bids) {
        StructuredLinkedList.List storage bidders = _getBatchBidders(currentBatchId);

        bids = new Bid[](bidders.sizeOf());

        (, uint256 bid) = bidders.getPreviousNode(0);
        for (uint256 i = 0; i < bidders.sizeOf(); ++i) {
            (bids[i].bidId, bids[i].numTokens, bids[i].pricePerToken) = _decodeBid(bid);
            bids[i].bidder = bidderById[bids[i].bidId];

            (, bid) = bidders.getPreviousNode(bid);
        }
    }

    /**
        Owner methods
     */
    function whitelistBidders(
        address[] calldata biddersList,
        uint64[] calldata numTokensList,
        uint64[] calldata firstTokenIdList
    ) external onlyOwner checkAuctionInactive {
        require(numTokensList.length == firstTokenIdList.length, "Mismatch in array size for direct whitelist");
        for (uint256 i = 0; i < numTokensList.length; ++i) {
            require(firstTokenIdList[i] == nextFreeTokenId, "Cannot have gaps when whitelisting");

            _whitelistBidder(biddersList[i], numTokensList[i], firstTokenIdList[i]);
        }
    }

    function transferFunds(address payable recipient) external onlyOwner {
        uint256 transferAmount = claimableFunds;
        claimableFunds = 0;
        Address.sendValue(recipient, transferAmount);
    }

    /**
        Internal getters
     */
    function _getBatch(uint256 batchId) internal view returns (Batch storage) {
        return batches[batchId];
    }

    function _getBatchState(uint256 batchId) internal view returns (BatchState storage) {
        return batches[batchId].parameters;
    }

    function _getBatchBidders(uint256 batchId) internal view returns (StructuredLinkedList.List storage) {
        return batches[batchId].bidders;
    }

    function _getBatchBidByBidder(uint256 batchId, address bidder) internal view returns (uint256) {
        return batches[batchId].bidByBidder[bidder];
    }

    function _getBidInfo(uint256 batchId, address bidder)
        internal
        view
        returns (
            uint64 bidId,
            uint64 numTokens,
            uint128 pricePerToken,
            uint256 bid
        )
    {
        StructuredLinkedList.List storage bidders = _getBatchBidders(batchId);

        bid = batches[batchId].bidByBidder[bidder];
        if (bid != 0 && bidders.nodeExists(bid)) {
            (bidId, numTokens, pricePerToken) = _decodeBid(bid);
        }
    }

    /**
        Internal bid management
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
        uint256 batchId,
        address bidder,
        uint64 numTokens,
        uint128 pricePerToken
    ) internal {
        // Optimize by receiving prev and next bid
        StructuredLinkedList.List storage bidders = _getBatchBidders(batchId);

        uint64 bidId = ++_getBatch(batchId).currentBidId;

        uint256 bid = _encodeBid(bidId, numTokens, pricePerToken);
        uint256 next = bidders.getSortedSpot(address(this), getValue(bid));
        (, uint256 prev) = bidders.getPreviousNode(next);

        _checkPriceUnique(prev, next, pricePerToken);

        bidders.insertBefore(next, bid);
        batches[batchId].bidByBidder[bidder] = bid;
        bidderById[bidId] = bidder;
    }

    function _checkPriceUnique(
        uint256 prev,
        uint256 next,
        uint128 pricePerToken
    ) internal pure {
        if (prev != 0) {
            (, , uint128 prevPricePerToken) = _decodeBid(prev);
            require(prevPricePerToken != pricePerToken, "Bid price is not unique");
        }
        if (next != 0) {
            (, , uint128 nextPricePerToken) = _decodeBid(next);
            require(nextPricePerToken != pricePerToken, "Bid price is not unique");
        }
    }

    function _cancelBid(
        uint256 batchId,
        address bidder,
        bool refundAmount
    ) internal {
        (uint64 bidId, uint64 numTokens, uint128 pricePerToken, uint256 node) = _getBidInfo(batchId, bidder);
        if (node != 0) {
            StructuredLinkedList.List storage bidders = _getBatchBidders(batchId);

            bidders.remove(node);
            delete bidderById[bidId];
            delete batches[batchId].bidByBidder[bidder];

            if (refundAmount) {
                refunds[bidder] += numTokens * pricePerToken;
            }
        }
    }

    /**
        Internal purchase
     */
    function _purchase(
        uint256 batchId,
        address bidder,
        uint64 numTokens,
        uint128 pricePerToken
    ) internal {
        _getBatchState(batchId).numTokensAuctioned -= numTokens;

        _whitelistBidder(bidder, numTokens, nextFreeTokenId);
        _chargeBidder(bidder, pricePerToken * numTokens);
    }

    /**
        Internal funds and credit 
     */
    function _chargeBidder(address bidder, uint256 amount) internal {
        uint256 credit = refunds[bidder];
        if (credit < amount) {
            require(msg.value == (amount - credit), "Sent incorrect amount of cash");
            refunds[bidder] = 0;
        } else {
            refunds[bidder] -= amount;
        }
    }

    function _claimRefund(address bidder) internal {
        uint256 amountToRefund = refunds[bidder];
        if (amountToRefund > 0) {
            refunds[bidder] = 0;
            Address.sendValue(payable(bidder), amountToRefund);
        }
    }

    /**
        Internal whitelisting
     */
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

    /**
        Linked list utility function
     */
    function getValue(uint256 id) public pure returns (uint256) {
        return id >> 128;
    }
}

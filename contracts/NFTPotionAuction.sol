// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "./utils/StructuredLinkedList.sol";
import "./INFTPotionWhitelist.sol";

contract NFTPotionAuction is Ownable, INFTPotionWhitelist, IStructureInterface {
    using SafeERC20 for IERC20;
    using StructuredLinkedList for StructuredLinkedList.List;

    /**
        @notice Initialized in startBatch, contains the state of the auction.
        When the auction ends it holds the clearing price use to determine if a
        bidder can claim tokens or not
     */
    struct BatchState {
        uint128 minimumPricePerToken;
        uint128 directPurchasePrice;
        uint64 startTokenId;
        uint64 numTokensAuctioned;
        uint128 auctionEndDate;
        uint128 clearingPrice;
        uint64 clearingBidId;
        uint64 lastBidderNumAssignedTokens;
        uint64 numTokensSold;
        uint64 numTokensClaimed;
    }

    /**
        @notice Contains the state of the auction, a sorted list of bids, the latest bid for
        each bidder and a counter for the bid ID
     */
    struct Batch {
        BatchState state;
        StructuredLinkedList.List bidders;
        mapping(address => uint256) bidByBidder;
        uint64 currentBidId;
    }

    /**
        Bid information
     */
    struct Bid {
        address bidder;
        uint64 bidId;
        uint64 numTokens;
        uint128 pricePerToken;
    }

    // Batch management
    mapping(uint256 => Batch) internal batches;
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
    event BatchStarted(uint256 indexed batchId);
    event BatchEnded(uint256 indexed batchId);
    event SetBid(uint256 indexed batchId, address indexed bidder, uint64 numTokens, uint128 pricePerToken);
    event CancelBid(uint256 indexed batchId, address indexed bidder);
    event Purchase(uint256 indexed batchId, address indexed bidder, uint64 numTokens);
    event Whitelist(uint256 indexed batchId, address indexed bidder);

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

    //---------------------------
    // Auction management
    //---------------------------

    /**
        @notice Starts a new batch auction with the given parameters

        @dev currentBatchId is not incremented here as it is incremented in endBatch instead.
        This helps identify when a batch is already ended 
        
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

        // clearingPrice, lastBidderNumAssignedTokens, numTokensSold and numTokensClaimed are left at 0

        batches[currentBatchId].currentBidId = type(uint64).max;

        emit BatchStarted(currentBatchId);
    }

    /**
        @notice Ends a batch and calculates the clearing price
        @param numBidsToProcess The maximum bids to process when calculating the clearing price

        @dev This function processes the standing bids from highest to lowest and calculates
        the clearing price. The numBidsToProcess parameter can be used to control how many
        bids are processed at a time, in case the amount of gas needed to process all winning
        exceeds the gas limit
    */
    function endBatch(uint256 numBidsToProcess) external {
        BatchState storage batchState = _getBatchState(currentBatchId);

        require(batchState.auctionEndDate != 0, "Auction has not been started yet");
        require(
            block.timestamp > batchState.auctionEndDate || batchState.numTokensAuctioned == 0,
            "Auction cannot be ended yet"
        );

        StructuredLinkedList.List storage bidders = _getBatchBidders(currentBatchId);
        uint256 bid = bidders.iterEnd();

        uint64 numTokensLeft = batchState.numTokensAuctioned - batchState.numTokensSold;

        while (numBidsToProcess > 0 && bid != 0 && numTokensLeft > 0) {
            (uint64 bidId, uint64 numRequestedTokens, uint128 pricePerToken) = _decodeBid(bid);

            if (numRequestedTokens >= numTokensLeft) {
                numRequestedTokens = numTokensLeft;
                // Calculate how many tokens the last bidder will get and save it, so it can
                // be used by claimTokenIds when whitelisting token IDs
                batchState.lastBidderNumAssignedTokens = numTokensLeft;

                // Clearing price is used to determine if a bidder can claim tokens or not.
                // The clearing bid ID is used along the clearing price to resolve ties with the
                // same price. In case of a tie, the bid that was added earlier has priority
                batchState.clearingPrice = pricePerToken;
                batchState.clearingBidId = bidId;
            }

            claimableFunds += numRequestedTokens * pricePerToken;
            numTokensLeft -= numRequestedTokens;
            numBidsToProcess--;

            bid = bidders.iterPrev(bid);
        }

        batchState.numTokensSold = batchState.numTokensAuctioned - numTokensLeft;

        if (bid == 0 || batchState.numTokensSold == batchState.numTokensAuctioned) {
            // Clearing price has been fully calculated
            nextFreeTokenId += batchState.numTokensSold;

            emit BatchEnded(currentBatchId);

            currentBatchId++;
        }
    }

    //-------------------
    // Bid management
    //-------------------

    /**
        @notice Sets a bid for the current batch using the sender as the bidder
        @param numTokens The number of tokens to bid for
        @param pricePerToken The price per token to bid forBid 
        @param prevBid The bid that comes before the new one in the sorted list

        @dev See _insertBid for an explanation on how prevBid is used
     */
    function setBid(
        uint64 numTokens,
        uint128 pricePerToken,
        uint256 prevBid
    ) external payable checkAuctionActive {
        _setBid(_msgSender(), numTokens, pricePerToken, prevBid);
    }

    /**
        @notice Cancels a bid for the given batch ID and refunds the sender if requested
        @param batchId The ID of the batch to cancel the bid for
        @param alsoRefund If true, the sender will be refunded the amount of cash they bid for

        @dev If the bidder does not request a refund to be sent back, the amount will be credited
        internally and used in future bids. It can also be requested later on by calling claimRefund
    */
    function cancelBid(uint256 batchId, bool alsoRefund) external {
        address bidder = _msgSender();

        _cancelBid(batchId, bidder, true);

        if (alsoRefund) {
            _claimRefund(bidder);
        }
        emit CancelBid(batchId, bidder);
    }

    /**
        @notice Directly purchases an amount of tokens from the current batch at the purchase price
        @param numTokens The number of tokens to purchase

        @dev This function will use any available credit for the bidder and require the bidder
        to send the rest to cover the purchase. The amount of tokens to purchase must be less than
        the currently available tokens in the batch
     */
    function purchase(uint64 numTokens) external payable checkAuctionActive {
        BatchState storage batchState = _getBatchState(currentBatchId);

        require(numTokens <= batchState.numTokensAuctioned, "Too many tokens for direct purchase");

        _purchase(currentBatchId, _msgSender(), numTokens, batchState.directPurchasePrice);

        emit Purchase(currentBatchId, _msgSender(), numTokens);
    }

    //-----------------------
    // Claiming functions
    //-----------------------

    /**
        @notice Claims token IDs for the sender
        @param batchId The ID of the batch to claim the token IDs for
        @param alsoRefund If true, the sender will be refunded the the current existing credit they have
    */
    function claimTokenIds(uint256 batchId, bool alsoRefund) external {
        _claim(batchId, _msgSender(), alsoRefund);
    }

    /**
        @notice Claims the existing credit for the sender

        @dev This function can be called at any time, during an active batch or in-between batches
    */
    function claimRefund() external {
        require(refunds[_msgSender()] > 0, "No refundable cash");
        _claimRefund(_msgSender());
    }

    //-------------------
    //  View functions
    //-------------------
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

    function getPreviousBid(
        uint256 batchId,
        uint64 numTokens,
        uint128 pricePerToken
    ) external view returns (uint256 prev) {
        StructuredLinkedList.List storage bidders = _getBatchBidders(batchId);

        uint64 bidId = _getBatch(batchId).currentBidId;
        uint256 bid = _encodeBid(bidId, numTokens, pricePerToken);
        (prev, ) = bidders.getSortedSpot(address(this), getValue(bid));
    }

    //-------------------
    // Owner methods
    //-------------------

    /**
        @notice Sets a bid for the current batch on behalf of the given bidder
        @param numTokens The number of tokens to bid for
        @param pricePerToken The price per token to bid for

        @dev Only owner can set bids on behalf of other users
     */
    function setBidOnBehalf(
        address bidder,
        uint64 numTokens,
        uint128 pricePerToken,
        uint256 prevBid
    ) external payable onlyOwner checkAuctionActive {
        _setBid(bidder, numTokens, pricePerToken, prevBid);
    }

    /**
        @notice Claims token IDs on behalf of a bidder
        @param batchId The ID of the batch to claim the token IDs for
        @param bidder Address to claim the token IDs for
        @param alsoRefund If true, the sender will be refunded the the current existing credit they have
    */
    function claimTokenIdsOnBehalf(
        uint256 batchId,
        address bidder,
        bool alsoRefund
    ) external onlyOwner {
        _claim(batchId, bidder, alsoRefund);
    }

    /**
        @notice Directly whitelists bidders for the given tokenIDs ranges
        @param biddersList The list of bidders to whitelist
        @param numTokensList The list of number of tokens to assign to each bidder
        @param firstTokenIdList The list of first token ID to assign to each bidder

        @dev Owner only

        @dev The ranges of first token ID + num tokens for each consecutive bidder must be contiguous,
        and no gaps are allowed. If more than one range is to be given to the same bidder, the bidder
        address can be repeated in the bidders list. This function can only be called in-between batches
     */
    function whitelistBidders(
        address[] calldata biddersList,
        uint64[] calldata numTokensList,
        uint64[] calldata firstTokenIdList
    ) external onlyOwner checkAuctionInactive {
        require(numTokensList.length == firstTokenIdList.length, "Mismatch in array size for direct whitelist");
        for (uint256 i = 0; i < numTokensList.length; ++i) {
            require(firstTokenIdList[i] == nextFreeTokenId, "Cannot have gaps when whitelisting");

            _addWhitelist(biddersList[i], numTokensList[i], firstTokenIdList[i]);
        }
    }

    /**
        @notice Transfer the claimable funds to the recipient

        @dev Owner only
    */
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
        return batches[batchId].state;
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

    //---------------------------
    //  Internal bid management
    //---------------------------
    function _encodeBid(
        uint64 bidId,
        uint64 numTokens,
        uint128 pricePerToken
    ) internal pure returns (uint256) {
        return (uint256(pricePerToken) << 128) + (uint256(bidId) << 64) + uint256(numTokens);
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
        bidId = uint64((node << 128) >> 192);
        numTokens = uint64((node << 192) >> 192);
        pricePerToken = uint128(node >> 128);
    }

    /**
        @notice Sets a bid for the current batch and the given bidder
        @param numTokens The number of tokens to bid for
        @param pricePerToken The price per token to bid for
        @param prevBid The bid that comes right after the new bid being set
     */
    function _setBid(
        address bidder,
        uint64 numTokens,
        uint128 pricePerToken,
        uint256 prevBid
    ) internal {
        BatchState storage batchState = _getBatchState(currentBatchId);

        require(pricePerToken >= batchState.minimumPricePerToken, "Bid must reach minimum amount");
        require(pricePerToken < batchState.directPurchasePrice, "Bid cannot be higher than direct price");

        _cancelBid(currentBatchId, bidder, true);
        _addBid(currentBatchId, bidder, numTokens, pricePerToken, prevBid);
        _chargeBidder(bidder, pricePerToken * numTokens);

        emit SetBid(currentBatchId, bidder, numTokens, pricePerToken);
    }

    function _addBid(
        uint256 batchId,
        address bidder,
        uint64 numTokens,
        uint128 pricePerToken,
        uint256 prev
    ) internal {
        uint64 bidId = _getBatch(batchId).currentBidId--;

        uint256 bid = _encodeBid(bidId, numTokens, pricePerToken);

        _insertBid(batchId, bid, prev);

        batches[batchId].bidByBidder[bidder] = bid;
        bidderById[bidId] = bidder;
    }

    /**
        @notice Inserts a bid into the list of bids for the given batch
        @param batchId The ID of the batch to insert the bid into
        @param bid The bid to insert
        @param prev The bid that comes right after the new bid being set
     
        @dev prev bid is used to optimize the insertion of the bid into the list. In a normal case, prev
        bid still exists and we can just use it as a starting point to search forward in the linked list.
        However prev bid may have disappeared in the time that the transaction gets to be mined. In that
        case we search backwards from prev bid until we find a valid bid (one that has not been unlinked
        from the list) Then we search forward from that bid until we find the right sport to insert the new
        one
    */
    function _insertBid(
        uint256 batchId,
        uint256 bid,
        uint256 prev
    ) internal {
        StructuredLinkedList.List storage bidders = _getBatchBidders(batchId);
        require(bidders.nodeExists(prev), "Previous bid not found in bid history");

        // In the time that takes for the trasaction to be mined, the prev bid may have been removed.
        // If so, we search back from the prev bid until we find a valid one
        (, uint256 next) = bidders.getNextNode(prev);
        while (prev != 0 && next == 0) {
            (, prev) = bidders.getPreviousNode(prev);
            (, next) = bidders.getNextNode(prev);
        }

        // Here prev is a valid bid that is smaller than the new bid. Now we search forward
        // from prev until we find the right place to insert the new bid
        (, next) = bidders.getSortedSpotFrom(address(this), getValue(bid), prev);
        bidders.insertBefore(next, bid);
    }

    /**
        @notice Cancels a bid for the given batch and bidder. It also allows to refund the pending credit
        @param batchId The ID of the batch to cancel the bid for
        @param bidder The bidder to cancel the bid for
        @param refundAmount Whether to refund the pending credit or not

        @dev The bid being cancel is just unlinked from the sorted list. This means that its link to the
        next node is deleted. This allows us to find the cancelled bid in the history and use it to
        optimize the insertion
    */
    function _cancelBid(
        uint256 batchId,
        address bidder,
        bool refundAmount
    ) internal {
        (uint64 bidId, uint64 numTokens, uint128 pricePerToken, uint256 node) = _getBidInfo(batchId, bidder);
        if (node == 0) {
            return;
        }

        StructuredLinkedList.List storage bidders = _getBatchBidders(batchId);

        bidders.unlink(node);
        delete bidderById[bidId];
        delete batches[batchId].bidByBidder[bidder];

        if (refundAmount) {
            refunds[bidder] += numTokens * pricePerToken;
        }
    }

    /**
        @notice Tries to claim the token IDs for the given batch ID and the given bidder
        @param batchId The ID of the batch to claim the token IDs for
        @param bidder Address to claim the token IDs for
        @param alsoRefund If true, the sender will be refunded the the current existing credit they have

        @dev This function can be called even if the bidder has not won any token IDs. If called when
        no token IDs have been won this function behaves exactly like cancelBid. Any amount credited
        after the bid has been processed will be send back to the caller if alsoRefund is set to true
     */
    function _claim(
        uint256 batchId,
        address bidder,
        bool alsoRefund
    ) internal {
        BatchState storage batchState = _getBatchState(batchId);
        uint256 bid = _getBatchBidByBidder(batchId, bidder);
        require(bid != 0, "Bidder has no claimable bid");

        (uint64 bidId, uint64 numTokens, uint128 pricePerToken) = _decodeBid(bid);

        if (
            pricePerToken > batchState.clearingPrice ||
            (pricePerToken == batchState.clearingPrice && bidId > batchState.clearingBidId)
        ) {
            _whitelistBidder(batchId, bidder, numTokens);
        } else if (pricePerToken == batchState.clearingPrice && bidId == batchState.clearingBidId) {
            _whitelistBidder(batchId, bidder, batchState.lastBidderNumAssignedTokens);
        }

        _cancelBid(batchId, bidder, false);

        if (alsoRefund) {
            _claimRefund(bidder);
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
        _getBatchState(batchId).numTokensSold += numTokens;

        _whitelistBidder(batchId, bidder, numTokens);
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
        uint256 batchId,
        address bidder,
        uint64 numTokens
    ) internal {
        BatchState storage batchState = _getBatchState(batchId);

        _addWhitelist(bidder, numTokens, batchState.startTokenId + batchState.numTokensClaimed);

        batchState.numTokensClaimed += numTokens;

        emit Whitelist(batchId, bidder);
    }

    function _addWhitelist(
        address bidder,
        uint64 numTokens,
        uint64 firstTokenId
    ) internal {
        WhitelistData memory whitelistData;

        whitelistData.firstId = firstTokenId;
        whitelistData.lastId = firstTokenId + numTokens - 1;

        whitelist[bidder].push(whitelistData);
    }

    /**
        Linked list utility function
     */
    function getValue(uint256 id) public pure returns (uint256) {
        return id >> 64;
    }
}

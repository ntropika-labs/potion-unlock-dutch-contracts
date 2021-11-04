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

    uint256 public currentAuctionId;
    mapping(uint256 => BatchData) public batches;

    uint32 private currentBidId;
    uint64 public nextFreeTokenId = 1;
    uint64 private nextBatchStartBidId = 1;

    struct BidData {
        uint64 bidId;
        address bidderAddress;
        uint64 numTokens;
        uint128 pricePerToken;
    }

    // Bidders info for each auction ID
    StructuredLinkedList.List[] public bidders; // Bidders sorted list by auction ID
    mapping(address => uint256)[] public bidByBidder; // bidder -> bid

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
        uint256 indexed auctionId,
        uint256 indexed startTimestamp,
        uint64 indexed startTokenId,
        uint64 endTokenId,
        uint128 minimumPricePerToken,
        uint128 directPurchasePrice,
        uint128 auctionEndDate
    );
    event BatchEnded(
        uint256 indexed auctionId,
        uint256 indexed auctionEndTimestamp,
        uint256 indexed actualEndTimestamp,
        uint64 numTokensSold
    );
    event SetBid(uint256 indexed auctionId, address indexed bidder, uint64 numTokens, uint128 pricePerToken);
    event CancelBid(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 cancelTimestamp,
        uint256 auctionEndTimestamp
    );
    event Purchase(uint256 indexed auctionId, address indexed bidder, uint64 numTokens, uint128 pricePerToken);

    /**
        Modifiers
    */
    modifier checkAuctionActive() {
        require(block.timestamp <= _getBatch(currentAuctionId).auctionEndDate, "Auction already ended");
        _;
    }

    modifier checkAuctionInactive() {
        require(block.timestamp > _getBatch(currentAuctionId).auctionEndDate, "Auction still active");
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

        currentAuctionId++;

        BatchData storage batch = _getBatch(currentAuctionId);

        batch.startTokenId = startTokenId;
        batch.numTokensAuctioned = endTokenId - startTokenId + 1;
        batch.minimumPricePerToken = minimumPricePerToken;
        batch.directPurchasePrice = directPurchasePrice;
        batch.auctionEndDate = auctionEndDate;

        emit BatchStarted(
            currentAuctionId,
            block.timestamp,
            startTokenId,
            endTokenId,
            minimumPricePerToken,
            directPurchasePrice,
            auctionEndDate
        );
    }

    function endBatch() external {
        BatchData storage batch = _getBatch(currentAuctionId);

        require(block.timestamp > batch.auctionEndDate || batch.numTokensAuctioned == 0, "Auction cannot be ended yet");

        while (node != 0 && batch.numTokensAuctioned > 0) {
            uint256 node = bidders[currentAuctionId].popBack();
            if (node == 0) {
                break;
            }

            (uint64 bidId, uint64 numRequestedTokens, uint128 pricePerToken) = _decodeBid(node);

            if (numRequestedTokens > batch.numTokensAuctioned) {
                numRequestedTokens = batch.numTokensAuctioned;
            }

            address bidder = bidderById[bidId];

            _cancelBid(currentAuctionId, bidder);
            _purchase(currentAuctionId, bidder, numRequestedTokens, pricePerToken);
        }

        nextBatchStartBidId = currentBidId + 1;

        emit BatchEnded(currentAuctionId, batch.auctionEndDate, block.timestamp, nextFreeTokenId - batch.startTokenId);
    }

    /**
        Bid management
     */
    function setBid(uint64 numTokens, uint128 pricePerToken) external payable checkAuctionActive {
        BatchData storage batch = _getBatch(currentAuctionId);

        require(pricePerToken >= batch.minimumPricePerToken, "Bid must reach minimum amount");
        require(pricePerToken < batch.directPurchasePrice, "Bid cannot be higher than direct price");

        address bidder = _msgSender();

        _cancelBid(currentAuctionId, bidder);
        _addBid(currentAuctionId, bidder, numTokens, pricePerToken);
        _chargeBidder(bidder, pricePerToken * numTokens, false);

        emit SetBid(currentAuctionId, bidder, numTokens, pricePerToken);
    }

    function cancelBid(uint256 auctionId) external {
        _cancelBid(auctionId, _msgSender());

        emit CancelBid(auctionId, _msgSender(), block.timestamp, _getBatch(auctionId).auctionEndDate);
    }

    /**
        Direct purchase
     */
    function purchase(uint64 numTokens) external payable checkAuctionActive {
        BatchData storage batch = _getBatch(currentAuctionId);

        require(numTokens <= batch.numTokensAuctioned, "Too many tokens for direct purchase");

        _purchase(currentAuctionId, _msgSender(), numTokens, batch.directPurchasePrice);

        emit Purchase(currentAuctionId, _msgSender(), numTokens, batch.directPurchasePrice);
    }

    /**
     * @notice Calculates how much can be refunded to the bidder and sends this value back
     *
     * @dev This function works together with _chargeBidder to manage the credit and the refundable
     *      cash for a bidder (see _chargeBidder). All cash sent by a bidder is pre-marked as refundable.
     *      claimRefund will look at the last valid bid to understand how much of the refundable cash
     *      is locked to a bid. The rest of the refundable amount (refundable amount - latest bid amount)
     *      is sent back to the bidder. This allows for easy upkeeping of the refundable amounts throughout
     *      all the cycle of start/end batch and set/cancel bid
     */
    function claimRefund() public {
        /*address bidder = _msgSender();

        // Get latest bid, if it does not exist the returned values will
        // be 0 which works well with the rest of the calculation
        (, uint64 numTokens, uint128 pricePerToken) = _decodeBid(bidByBidder[bidder]);

        // Final refundable amount will be the pre-marked refundable amount
        // minus the amount locked to the latest valid bid
        uint256 lockedFunds = numTokens * pricePerToken;
        uint256 amountToRefund = refunds[bidder] - lockedFunds;

        // Pre-mark the latest bid amount as refundable
        refunds[bidder] = lockedFunds;

        require(amountToRefund > 0, "No refund pending");

        Address.sendValue(payable(bidder), amountToRefund);
        */
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
        (bidId, numTokens, pricePerToken) = _decodeBid(bidByBidder[currentAuctionId][bidder]);
        valid = bidId >= nextBatchStartBidId;
    }

    function getAllBids() external view returns (BidData[] memory bids) {
        StructuredLinkedList.List storage biddersList = bidders[currentAuctionId];

        bids = new BidData[](biddersList.sizeOf());

        (, uint256 node) = biddersList.getPreviousNode(0);
        for (uint256 i = 0; i < biddersList.sizeOf(); ++i) {
            (bids[i].bidId, bids[i].numTokens, bids[i].pricePerToken) = _decodeBid(node);
            bids[i].bidderAddress = bidderById[bids[i].bidId];

            (, node) = biddersList.getPreviousNode(node);
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
        Internals
     */
    function _getBatch(uint256 auctionId) internal view returns (BatchData storage) {
        return batches[auctionId];
    }

    function _getBidders(uint256 auctionId) internal view returns (StructuredLinkedList.List storage) {
        return bidders[auctionId];
    }

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
        uint256 auctionId,
        address bidder,
        uint64 numTokens,
        uint128 pricePerToken
    ) internal {
        uint64 bidId = ++currentBidId;

        uint256 node = _encodeBid(bidId, numTokens, pricePerToken);
        require(!bidders[auctionId].nodeExists(node), "PANIC!! This should not happen!");

        uint256 position = bidders[auctionId].getSortedSpot(address(this), getValue(node));
        bidders[auctionId].insertBefore(position, node);
        bidByBidder[auctionId][bidder] = node;
        bidderById[bidId] = bidder;
    }

    function _cancelBid(uint256 auctionId, address bidder) internal {
        (uint64 bidId, , , uint256 node) = _getBidInfo(auctionId, bidder);
        if (node != 0) {
            bidders[auctionId].remove(node);
            delete bidderById[bidId];
            delete bidByBidder[auctionId][bidder];
        }
    }

    function _getBidInfo(uint256 auctionId, address bidder)
        internal
        view
        returns (
            uint64 bidId,
            uint64 numTokens,
            uint128 pricePerToken,
            uint256 node
        )
    {
        node = bidByBidder[auctionId][bidder]; // bidder -> bid
        if (node != 0 && bidders[auctionId].nodeExists(node)) {
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
        uint256 auctionId,
        address bidder,
        uint64 numTokens,
        uint128 pricePerToken
    ) internal {
        batches[auctionId].numTokensAuctioned -= numTokens;

        _whitelistBidder(bidder, numTokens, nextFreeTokenId);
        _chargeBidder(bidder, pricePerToken * numTokens, true);
    }

    /**
     * @notice Charges a bidder with a specific amount taking into account the existing credit
     *
     * @param bidder The address to charge
     * @param amount The amount to be charged
     * @param lockFunds Whether the funds will be locked in the contract and added to the
     *                  claimable funds or can still be refunded to the bidder
     *
     *  @dev This function manages the refunds and credit logic. The cash that a bidder sent to the
     *       contract has 3 states: refundable, locked to a bid or fully locked. When a bidder sends
     *       a bid for the first time the cash they send is locked to that bid. If the bidder decides
     *       to rebid then this function uses the previous credit and calculates the difference to the
     *       previous bid:
     *           - If the bid is lower, the difference between the credit
     *             and the new bid is marked as refundable
     *           - If the bid is higher, the difference between the new bid
     *             and the credit is required to be sent along the transaction
     *
     *       All the cash that the bidder sends to the contract is pre-marked as refundable, and
     *       it is the claimRefund function the one that decides how much of that refund is locked
     *       to a bid by looking at the latest valid bid (see claimRefund). Pre-marking the cash
     *       as refundable allows the contract to avoid processing all refunds when endBatch is called
     */
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

            // Bidder must send the diff between the existing credit and the amount to pay.
            // If we are locking the funds then the full amount is marked as fully locked
            // and removed from the refunds. Otherwise the amount is pre-marked as refundable
            refunds[bidder] = lockFunds ? 0 : amount;
        } else if (
            /* credit > amount && */
            lockFunds
        ) {
            // When there is enough credit to cover the amount and we are locking the funds
            // we just mark amount as fully locked
            refunds[bidder] -= amount;
        }

        // In case the credit is enough to cover the amount and we are not locking the funds
        // we don't have to do anything, whatever amount is in refunds is already pre-marked
        // as refundable
    }

    /**
        Linked list utility function
     */
    function getValue(uint256 id) public pure returns (uint256) {
        return id >> 128;
    }
}

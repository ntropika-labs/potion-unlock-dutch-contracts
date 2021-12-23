// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./NFTPotionCredit.sol";
import "./NFTPotionAccessList.sol";
import "./NFTPotionERC20Funds.sol";
import "./utils/Utils.sol";

/**
    Manual Dutch Auction to sell NFTs at a changing price

    @dev This contract is used to sell NFTs at a changing price. The price changes are done manually through
    the changePrice function. In principle the price should be lowered over time, but this is not implemented
    and it is the responsability of the user to do it.

    @dev The rarityId parameter passed in the contract is an identifier that will be passed to the _purchaseItems
    function to help the child contract identify which NFT rarity the user wants to purchase
 */

contract NFTPotionDutchAuction is NFTPotionERC20Funds, NFTPotionAccessList, NFTPotionCredit {
    // Auuction State
    enum AuctionState {
        Inactive, // = 0
        Active // = 1
    }

    // Public variables
    uint256 public currentRarityId;
    uint256 public purchasePrice;
    AuctionState public auctionState;

    // Events
    event AuctionStarted(uint256 indexed rarityId, uint256 indexed startPrice);
    event AuctionStopped(uint256 indexed rarityId);
    event AuctionPriceChanged(uint256 indexed rarityId, uint256 indexed newPrice);

    // Modifiers
    modifier checkAuctionActive(uint256 rarityId) {
        require(auctionState == AuctionState.Active, "Auction is not active");
        require(rarityId == currentRarityId, "Active auction ID mismatch");
        _;
    }
    modifier checkRarityNotSoldOut(uint256 rarityId) {
        require(getRemainingNFTs(rarityId) > 0, "Rarity is already sold out");
        _;
    }

    // Constructor
    constructor(address _paymentToken) NFTPotionERC20Funds(_paymentToken) {}

    // Auction management

    /**
        @notice Starts an auction for a rarity ID starting at the specified price

        @param rarityId The ID for the rarity that is being auctioned
        @param startPrice The starting price of the tokens.

        @dev An auction can be started and stopped even if there are still remaining NFTs
        to be sold. An auction can be started later for the same rarity ID if there are still
        NFTs not sold
    */
    function startAuction(uint256 rarityId, uint256 startPrice) external onlyOwner checkRarityNotSoldOut(rarityId) {
        require(auctionState == AuctionState.Inactive, "Auction is already active");

        currentRarityId = rarityId;
        purchasePrice = startPrice;
        auctionState = AuctionState.Active;

        emit AuctionStarted(rarityId, startPrice);
    }

    /**
        @notice Stops the auction
     */
    function stopAuction() external onlyOwner {
        auctionState = AuctionState.Inactive;

        emit AuctionStopped(currentRarityId);
    }

    /**
        @notice Changes the purchase price of the auction

        @param newPrice The new purchase price
     */
    function changePrice(uint256 rarityId, uint256 newPrice) external onlyOwner checkAuctionActive(rarityId) {
        purchasePrice = newPrice;

        emit AuctionPriceChanged(rarityId, newPrice);
    }

    /**
        @notice Purchases and mints a number of NFTs

        @param rarityId The identifier of the items set being auctioned
        @param nftAmount The amount of NFTs to buy and mint
        @param limitPrice The maximum price the buyer is willing to pay for the purchase
        @param publicKey The public key of the buyer

        @dev The auction rarityId is sent in case the auction ends an another auction starts while
        the tx is in flight. This ensures that the purchase happens for the intended batch.

        @dev limitPrice is used to ensure that the buyer is not overpaying, in case the purchase price
        goes up, or that the auction ends and a new start is started while the tx is in flight.

        @dev The function ensures that no more than the maximum number of items will be purchased,
        so the implementer of the delegator function does not need to check for this.
     */
    function purchase(
        uint256 rarityId,
        uint32 nftAmount,
        uint256 limitPrice,
        string calldata publicKey
    ) external checkAuctionActive(rarityId) checkCallerAccess checkRarityNotSoldOut(rarityId) {
        require(purchasePrice <= limitPrice, "Current price is higher than limit price");

        // Calculate the nftAmount of NFTs that can still be bought
        nftAmount = Utils.min32(nftAmount, getRemainingNFTs(rarityId));

        // Get the credited nftAmount of NFTs of the buyer and calculate how many NFTs
        // must be paid for. Then consume the used nftAmount of credit
        uint256 creditAmount = getCredit(_msgSender(), rarityId);
        uint256 payableAmount = creditAmount < nftAmount ? nftAmount - creditAmount : 0;

        _consumeCredit(_msgSender(), rarityId, nftAmount - payableAmount);
        _purchaseItems(rarityId, nftAmount, limitPrice, publicKey);

        // While the tx was in flight the purchase price may have changed or the sender
        // may have sent more cash than needed. If so, refund the difference. This must
        // always be the last call because it will execute an external function. No
        // reentrancy guard is needed in this case because all state has already been
        // updated before the function is called
        _chargePayment(payableAmount * purchasePrice);
    }

    // Delegates

    /**
        @notice Requests the total number of NFTs that can still be sold for
        the given rarity ID

        @param rarityId The rarityId of the NFTs to purchase

        @return The total number of NFTs that can still be sold

        @dev The function must be overriden by the child contract and return the
        number of NFTs that can still be sold for the given rarity ID.
     */
    function getRemainingNFTs(uint256 rarityId) public virtual returns (uint32) {
        // Empty on purpose
    }

    /**
        @notice Delegate function to purchase the nftAmount of NFTs indicated in the call

        @param rarityId The batchId of the NFTs to purchase
        @param nftAmount The nftAmount of NFTs to be purchased
        @param limitPrice The maximum price the buyer is willing to pay
        @param publicKey The public key of the buyer

        @dev The function must be overriden by the child contract and implement the
        purchase logic
     */
    function _purchaseItems(
        uint256 rarityId,
        uint32 nftAmount,
        uint256 limitPrice,
        string calldata publicKey
    ) internal virtual {
        // Empty on purpose
    }
}

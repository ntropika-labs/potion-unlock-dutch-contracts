NFTPotionAuction Test Cases
---------------------------

  - Negative Cases
    - Start batch when another batch is started
    - Start batch with end date in the past
    - Start batch with incorrect start token ID
    - Start batch with direct price less than minimum price
    - setBid: call when batch is not active
    - setBid: call with price less than minimum
    - setBid: call with price higher or equal than purchase price
    - setBid: send amount of cash different than needed
    - cancelBid: call when batch is not active
    - purchase: call when batch is not active
    - purchase: call with more tokens that are auctioned
    - purchase: purchase some and call with more tokens that are left 
    - purchase: send different cash that needed
    - End batch when no batch is started
    - End batch before end date
    - claim: call before the batch is started
    - claim: call when bidder has no active bids
    - claim: call for a batch that has not ended
    - claimRefund: call when refundable cash is 0
    - whitelistBidders: Call from non-owner account
    - whitelistBidders: Call when batch is active
    - whitelistBidders: Call with different length for input arrays
    - whitelistBidders: Call with gaps or overlaps in token IDs list
    - transferFunds: Call with non-owner account
    - Pagination: set a bid between paginated endBatch
    - Pagination: cancel a bid between paginated endBatch
    - Pagination: claim a bid between paginated endBatch
    - Pagination: call with bids to process equal to 0

  - Auction Basic Cases
    - Bidder rebids several times
    - Bidder bids and cancels repeated times, no refund
    - Bidder bids and cancels repeated times, with refund
    - Bidder bids and cancels repeated times, sometimes with refund
    - Bidder purchase some tokens once
    - Bidder purchase some tokens several times
    - Bidder purchase all tokens at once
    - Bidder purchase all tokens in several purchases

  - Auction Full Cycle
    - Simple: 1 Batch, 20 bidders, 100 token IDs
    - Simple: 2 Batches, 20 bidders, 10 token IDs, then 100 token IDs
    - Simple: 2 Batches, 20 bidders, 10 token IDs, then 100 token IDs, Claim all after second batch
    - Simple: Several batches, 20 bidders, 10, 100, 50, 88, 34 tokenIDs
    - Purchase: 1 Batch, 20 tokens, 1 bidder purchases 5 tokens
    - Purchase: 1 Batch, 20 tokens, 3 bidders purchase 7,2,3 tokens each
    - Purchase: 1 Batch, 100 tokens, 10 bidders purchase 1 to 6 tokens each
    - Auction+Purchase: 1 Batch, 129 tokens, 12 bidders, 5 purchasers
    - Cancel Bid: 1 Batch, 876 tokens, previous bid is cancelled before new bid is mined
    - Cancel Bid: 1 Batch, 18 tokens, previous 10 bids are cancelled before new bid is mined

  - Owner Cases
    - whitelistBidders: whitelist before very first batch
    - whitelistBidders: whitelist after very first batch
    - whitelistBidders: whitelist after selling some tokens in normal auction
    - transferFunds: transfer funds after very first auction
    - transferFunds: transfer funds after first auction and after second auction
    - transferFunds: transfer funds only after 3 successful auctions

  - User Refunds
    - Several batches, claim refunds before new batch starts
    - Several batches, claim refunds after new batch starts
    - Several batches, claim some refunds before and some after batch starts

  - Edge cases
    - Same Price: 2 Batches, 20 bidders, 100 token IDs, all bidders bid the same price
    - Rebidding: with same number of tokens, different price
    - Rebidding: with different number of tokens, same price  
    - Purchase: 1 Batch, 100 tokens, 6 purchasers buy all tokens
    - Purchase: 3 Batches, 10,20,76 tokens, several purchasers buy all tokens
    - Purchase: 3 Batches, 10,20,76 tokens, 1 purchaser buy all tokens
    - Misc: Calling transferFunds before bidders have claimed their tokens
    - Misc: All bids are cancelled before new bid can be mined
    - Misc: minimum price equal to direct purchase price
    - Misc: endBatch pagination
    - Misc: call whitelistBidders with empty arrays

  - Full Auction:
    - 2 Batches, 3000, 7000, 1000 bidders, random distribution

 NFTPotionValidator Test Cases
 -----------------------------

  - Basic Cases:
    - Merkle single validation, first to last
    - Merkle single validation, last to first
    - Merkle multiple validation


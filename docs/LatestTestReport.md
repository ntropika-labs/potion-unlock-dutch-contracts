  NFTPotionAuction
    Negative Cases
      Start Batch
        ✓ Start batch when another batch is started
        ✓ Start batch with end date in the past
        ✓ Start batch with incorrect start token ID
        ✓ Start batch with direct price less than minimum price
      Set Bid
        ✓ Call when batch is not active
        ✓ Call with price less than minimum
        ✓ Call with price higher or equal than purchase price
        ✓ Send amount of cash different than needed
      Cancel Bid
        ✓ Call when batch is not active
      Purchase
        ✓ Call when batch is not active
        ✓ Call with more tokens that are auctioned
        ✓ Call with more tokens that are auctioned
        ✓ Purchase some and call with more tokens that are left
        ✓ Send less cash that needed
      End Batch
        ✓ End batch when no batch is started
        ✓ End batch before end date
      Claim
        ✓ Call before the batch is started
        ✓ Call when bidder has no active bids
      Claim Refund
        ✓ Call when refundable cash is 0
      Whitelist Bidders
        ✓ Call from non-owner account
        ✓ Call when batch is active
        ✓ Call with different length for input arrays
        ✓ Call with gaps or overlaps in token IDs list
      Transfer Funds
        ✓ Call with non-owner account
      Pagination
        ✓ Set a bid between paginated endBatch
        ✓ Cancel a bid between paginated endBatch
        ✓ Claim a bid between paginated endBatch
        ✓ Call with bids to process equal to 0

  NFTPotionAuction
    Auction Basic Cases
      ✓ Bidder rebids several times
      ✓ Bidder bids and cancels repeated times, no refund
      ✓ Bidder bids and cancels repeated times, with refund
      ✓ Bidder bids and cancels repeated times, sometimes with refund
      ✓ Bidder purchase some tokens once
      ✓ Bidder purchase some tokens several times
      ✓ Bidder purchase all tokens at once
      ✓ Bidder purchase all tokens in several purchases

  NFTPotionAuction
    Auction Full Cycle
      Simple
        ✓ 1 Batch, 20 bidders, 100 token IDs
        ✓ 2 Batches, 20 bidders, 10 token IDs, then 100 token IDs
      Purchase
        ✓ 1 Batch, 20 tokens, 1 bidder purchases 5 tokens
        ✓ 1 Batch, 20 tokens, 3 bidders purchase 7,2,3 tokens each
        ✓ 1 Batch, 100 tokens, 10 bidders purchase 1 to 6 tokens each
      Auction + Purchase
        ✓ 1 Batch, 129 tokens, 12 bidders, 5 purchasers
      Cancel Bid
        ✓ 1 Batch, 876 tokens, previous bid is cancelled before new bid is mined
        ✓ 1 Batch, 18 tokens, previous 10 bids are cancelled before new bid is mined

  NFTPotionAuction
    Owner Cases
      Whitelist Bidders
        ✓ Whitelist before very first batch
        ✓ Whitelist after very first batch
        ✓ Whitelist after selling some tokens in normal auction
      Transfer Funds
        ✓ Transfer funds after very first auction
        ✓ Transfer funds after first auction and after second auction
        ✓ Transfer funds only after 3 successful auctions

  NFTPotionAuction
    User Refunds
      ✓ Several batches, claim refunds before new batch starts
      ✓ Several batches, claim refunds after new batch starts
      ✓ Several batches, claim some refunds before, during and after batch

  NFTPotionAuction
    Edge Cases
      Rebidding
        ✓ With same number of tokens, different price
        ✓ With different number of tokens, same price
      Purchase
        ✓ 1 Batch, 600 tokens, 6 purchasers buy all tokens
        ✓ 3 Batches, 1440,4624,10350 tokens, several purchasers buy all tokens
        ✓ 3 Batches, 1440,4624,10350 tokens, 1 purchaser buy all tokens
      Misc
        ✓ Calling transferFunds before bidders have claimed their tokens
        ✓ All bids are cancelled before new bid can be mined
        ✓ Minimum price equal to direct purchase price
        ✓ End Batch pagination
        ✓ Call whitelistBidders with empty arrays

  NFTPotionAuction
    Full Auction (RandomSeed = 2337516108913735)
        [Batch 1/2]
           [Round 1/3]: 100%                   
           [Round 2/3]: 100%                   
           [Round 3/3]: 100%                   
        [Batch 2/2]
           [Round 1/3]: 100%                   
           [Round 2/3]: 100%                   
           [Round 3/3]: 100%                   
      ✓ 3 Batches, 3000, 7000 tokens, 1000 bidders, random distribution

·-----------------------------------------|---------------------------|-------------|-----------------------------·
|           Solc version: 0.8.9           ·  Optimizer enabled: true  ·  Runs: 200  ·  Block limit: 30000000 gas  │
··········································|···························|·············|······························
|  Methods                                ·              101 gwei/gas               ·       4090.04 eur/eth       │
·····················|····················|·············|·············|·············|···············|··············
|  Contract          ·  Method            ·  Min        ·  Max        ·  Avg        ·  # calls      ·  eur (avg)  │
·····················|····················|·············|·············|·············|···············|··············
|  NFTPotionAuction  ·  cancelBid         ·      30270  ·      74166  ·      48224  ·          626  ·      19.92  │
·····················|····················|·············|·············|·············|···············|··············
|  NFTPotionAuction  ·  claim             ·      57974  ·      99457  ·      86059  ·          302  ·      35.55  │
·····················|····················|·············|·············|·············|···············|··············
|  NFTPotionAuction  ·  claimRefund       ·          -  ·          -  ·      28953  ·          180  ·      11.96  │
·····················|····················|·············|·············|·············|···············|··············
|  NFTPotionAuction  ·  endBatch          ·      39081  ·     384688  ·     110429  ·          150  ·      45.62  │
·····················|····················|·············|·············|·············|···············|··············
|  NFTPotionAuction  ·  purchase          ·      74502  ·     125814  ·      90029  ·          393  ·      37.19  │
·····················|····················|·············|·············|·············|···············|··············
|  NFTPotionAuction  ·  setBid            ·      97366  ·     171588  ·     150736  ·         2544  ·      62.27  │
·····················|····················|·············|·············|·············|···············|··············
|  NFTPotionAuction  ·  startBatch        ·      97940  ·      98000  ·      97961  ·          148  ·      40.47  │
·····················|····················|·············|·············|·············|···············|··············
|  NFTPotionAuction  ·  transferFunds     ·      26451  ·      33651  ·      29253  ·          328  ·      12.08  │
·····················|····················|·············|·············|·············|···············|··············
|  NFTPotionAuction  ·  whitelistBidders  ·      29465  ·     376439  ·     289696  ·            4  ·     119.67  │
·····················|····················|·············|·············|·············|···············|··············
|  Deployments                            ·                                         ·  % of limit   ·             │
··········································|·············|·············|·············|···············|··············
|  NFTPotionAuction                       ·          -  ·          -  ·    2633801  ·        8.8 %  ·    1088.01  │
·-----------------------------------------|-------------|-------------|-------------|---------------|-------------·

  64 passing (2m)

Done in 138.89s.
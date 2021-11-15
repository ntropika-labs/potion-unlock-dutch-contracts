Version
=======
> solidity-coverage: v0.7.17

Instrumenting for coverage...
=============================

> INFTPotion.sol
> INFTPotionValidator.sol
> INFTPotionWhitelist.sol
> NFTPotionAuction.sol
> RarityConfigItem.sol
> utils/StructuredLinkedList.sol

Coverage skipped for:
=====================

> NFTPotion.sol
> NFTPotionValidator.sol

Compilation:
============

Compiling 21 files with 0.8.9
Warning: Contract code size exceeds 24576 bytes (a limit introduced in Spurious Dragon). This contract may not be deployable on mainnet. Consider enabling the optimizer (with a low "runs" value!), turning off revert strings, or using libraries.
  --> contracts/NFTPotionAuction.sol:13:1:
   |
13 | contract NFTPotionAuction is Ownable, INFTPotionWhitelist, IStructureInterface {
   | ^ (Relevant source part starts here and spans across multiple lines).


Compilation finished successfully

Network Info
============
> HardhatEVM: v2.6.6
> network:    hardhat



  NFTPotionAuction
    Negative Cases
      Start Batch
        ✓ Start batch when another batch is started (124ms)
        ✓ Start batch with end date in the past (42ms)
        ✓ Start batch with incorrect start token ID (568ms)
        ✓ Start batch with direct price less than minimum price
      Set Bid
        ✓ Call when batch is not active (87ms)
        ✓ Call with price less than minimum (61ms)
        ✓ Call with price higher or equal than purchase price (56ms)
        ✓ Send amount of cash different than needed (148ms)
      Cancel Bid
        ✓ Call when batch is not active (78ms)
      Purchase
        ✓ Call when batch is not active (83ms)
        ✓ Call with more tokens that are auctioned (50ms)
        ✓ Call with more tokens that are auctioned (42ms)
        ✓ Purchase some and call with more tokens that are left (190ms)
        ✓ Send less cash that needed (293ms)
      End Batch
        ✓ End batch when no batch is started (88ms)
        ✓ End batch before end date (41ms)
      Claim
        ✓ Call before the batch is started (96ms)
        ✓ Call when bidder has no active bids (165ms)
      Claim Refund
        ✓ Call when refundable cash is 0 (76ms)
      Whitelist Bidders
        ✓ Call from non-owner account (107ms)
        ✓ Call when batch is active (96ms)
        ✓ Call with different length for input arrays (49ms)
        ✓ Call with gaps or overlaps in token IDs list (72ms)
      Transfer Funds
        ✓ Call with non-owner account (111ms)
      Pagination
        ✓ Set a bid between paginated endBatch (2498ms)
        ✓ Cancel a bid between paginated endBatch (2418ms)
        ✓ Claim a bid between paginated endBatch (2208ms)
        ✓ Call with bids to process equal to 0 (1915ms)

  NFTPotionAuction
    Auction Basic Cases
      ✓ Bidder rebids several times (1054ms)
      ✓ Bidder bids and cancels repeated times, no refund (1221ms)
      ✓ Bidder bids and cancels repeated times, with refund (1308ms)
      ✓ Bidder bids and cancels repeated times, sometimes with refund (1576ms)
      ✓ Bidder purchase some tokens once (207ms)
      ✓ Bidder purchase some tokens several times (484ms)
      ✓ Bidder purchase all tokens at once (195ms)
      ✓ Bidder purchase all tokens in several purchases (1110ms)

  NFTPotionAuction
    Auction Full Cycle
      Simple
        ✓ 1 Batch, 20 bidders, 100 token IDs (5541ms)
        ✓ 2 Batches, 20 bidders, 10 token IDs, then 100 token IDs (10402ms)
      Purchase
        ✓ 1 Batch, 20 tokens, 1 bidder purchases 5 tokens (297ms)
        ✓ 1 Batch, 20 tokens, 3 bidders purchase 7,2,3 tokens each (353ms)
        ✓ 1 Batch, 100 tokens, 10 bidders purchase 1 to 6 tokens each (724ms)
      Auction + Purchase
        ✓ 1 Batch, 129 tokens, 12 bidders, 5 purchasers (5128ms)
      Cancel Bid
        ✓ 1 Batch, 876 tokens, previous bid is cancelled before new bid is mined (10474ms)
        ✓ 1 Batch, 18 tokens, previous 10 bids are cancelled before new bid is mined (7582ms)

  NFTPotionAuction
    Owner Cases
      Whitelist Bidders
        ✓ Whitelist before very first batch (154ms)
        ✓ Whitelist after very first batch (134ms)
        ✓ Whitelist after selling some tokens in normal auction (2347ms)
      Transfer Funds
        ✓ Transfer funds after very first auction (2215ms)
        ✓ Transfer funds after first auction and after second auction (8003ms)
        ✓ Transfer funds only after 3 successful auctions (7596ms)

  NFTPotionAuction
    User Refunds
      ✓ Several batches, claim refunds before new batch starts (7445ms)
      ✓ Several batches, claim refunds after new batch starts (7523ms)
      ✓ Several batches, claim some refunds before, during and after batch (12885ms)

  NFTPotionAuction
    Edge Cases
      Rebidding
        ✓ With same number of tokens, different price (4477ms)
        ✓ With different number of tokens, same price (4502ms)
      Purchase
        ✓ 1 Batch, 600 tokens, 6 purchasers buy all tokens (330ms)
        ✓ 3 Batches, 1440,4624,10350 tokens, several purchasers buy all tokens (3196ms)
        ✓ 3 Batches, 1440,4624,10350 tokens, 1 purchaser buy all tokens (785ms)
      Misc
        ✓ Calling transferFunds before bidders have claimed their tokens (3320ms)
        ✓ All bids are cancelled before new bid can be mined (3136ms)
        ✓ Minimum price equal to direct purchase price (746ms)
        ✓ End Batch pagination (2520ms)
        ✓ Call whitelistBidders with empty arrays (108ms)

  NFTPotionAuction
    Full Auction (RandomSeed = 5459416217074519)
        [Batch 1/2]
           [Round 1/3]: 100%                   
           [Round 2/3]: 100%                   
           [Round 3/3]: 100%                   
        [Batch 2/2]
           [Round 1/3]: 100%                   
           [Round 2/3]: 100%                   
           [Round 3/3]: 100%                   
      ✓ 3 Batches, 3000, 7000 tokens, 1000 bidders, random distribution (128399ms)


  64 passing (4m)

---------------------------|----------|----------|----------|----------|----------------|
File                       |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
---------------------------|----------|----------|----------|----------|----------------|
 contracts/                |      100 |      100 |      100 |      100 |                |
  INFTPotion.sol           |      100 |      100 |      100 |      100 |                |
  INFTPotionValidator.sol  |      100 |      100 |      100 |      100 |                |
  INFTPotionWhitelist.sol  |      100 |      100 |      100 |      100 |                |
  NFTPotionAuction.sol     |      100 |      100 |      100 |      100 |                |
  RarityConfigItem.sol     |      100 |      100 |      100 |      100 |                |
 contracts/utils/          |    97.62 |    92.86 |      100 |    97.78 |                |
  StructuredLinkedList.sol |    97.62 |    92.86 |      100 |    97.78 |            228 |
---------------------------|----------|----------|----------|----------|----------------|
All files                  |    99.48 |    98.65 |      100 |     99.5 |                |
---------------------------|----------|----------|----------|----------|----------------|

> Istanbul reports written to ./coverage/ and ./coverage.json
Done in 274.38s.
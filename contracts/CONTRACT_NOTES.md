# System Quick Notes

The contracts implement a Dutch auction system where an NFT rarity can be opened to auction at a certain
price. Over time, this starting price can be decreased or increased (allowing for a reverse Dutch auction),
until the auction is stopped or the amount of NFTs for the auctioned rarity are sold out. The buyers can
purchase several NFTs at a time by paying the current price, and the NFTs get minted the moment they are
purchased. Only users added to a special access list can purchase NFTs during the auction, and nobody
can purchase NFTs if an auction is not active.

THe users will be able then to use this NFTs to access off-chain a decrypted secret being encrypted only
for their Metamask private key. Once they decrypt this secret the users can validate it on-chain through
the validator contract.

## Contracts Organization

The contracts are divided in 2 main contracts: NFTPotion.sol and NFTPotionValidator.sol

The NFTPotion.sol is the NFT contract in itself and it also has the Dutch Auction functionality. The decision
of doing it this way was taken to simplify the communication between the contracts.

During the game, the users will purchase NFTs directly from NFTPotion and will get a number of NFTs minted.
Later on the users will be able to validate this NFTs with NFTValidator.

# NFTPotionDutchAuction.sol

It takes care of the auction process. Most of the functionality is Owner only:

-   Start/stop an auction
-   Change the price during the auction
-   Transfer the received funds to a recipient, at any moment during (inside or outside an auction)
-   Add credit to the users. This credit can be used to purchase NFTs of a certain rarity for
    free (1 credit = 1 free NFT, regardless of the price)
-   Add/remove users to/from the access list: only users in the access list can purchase NFTs during an auction

The contract makes use of the following contracts:

-   NFTPotionAccessList: Implementation of an access list to be able to participate in the auction. Only users
    addresses that are present in the whitelist will be able to purchase
-   NFTPotionCredit: Takes care of the available credit for a user. This credit is specified as a number of NFTs
    that the user can purchase for free
-   NFTPotionERC20Funds: Takes care of transferring the correct amount of ERC20 to the contract and allowing the owner
    to send this funds to a recipient

# NFTPotion.sol

Inherits from NFTPotioDutchAuction and implements the ERC721 functionality. It communicates with the Dutch auction
contract through a coupld delegates to inform about the remaining items that are still available in a rarity and to
actually mint the purchased NFTs

# NFTPotionValidator.sol

Implements a Merkle Proof to validate the decrypted secrets for an NFT

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { bufferToHex } = require("ethereumjs-util");
const { toBN, fromBN } = require("./NFTPotionAuctionUtils");
const { NFT_NAME, NFT_SYMBOL } = require("../scripts/config");
const { getRaritiesConfig, encodeRarityConfig, getSecretPieceFromId } = require("../scripts/lib/utils");

require("dotenv").config();

class NFTPotionHelper {
    contract;
    owner;

    ipfsPrefix;
    ipfsSuffix;
    fullSecret;
    encryptionKeysMap;
    rarityConfig;
    rarityConfigEncoded;
    rarityNumMinted;
    purchasedRanges;

    // Globals
    currentItemsId;
    creditMap;

    // Contract State
    currentBatch;

    constructor(contract = undefined) {
        this.tokenName = NFT_NAME;
        this.tokenSymbol = NFT_SYMBOL;
        this.ipfsPrefix = process.env.IPFS_PREFIX;
        this.ipfsSuffix = process.env.IPFS_SUFFIX;
        this.rarityConfig = getRaritiesConfig();
        this.rarityConfigEncoded = encodeRarityConfig(this.rarityConfig);
        this.rarityNumMinted = new Array(this.rarityConfig.length).fill(0);
        this.purchasedRanges = new Map();

        this.contract = contract;
    }

    async initialize() {
        this.owner = (await ethers.getSigners())[0];

        const secret = await this.contract.fullSecret();

        this.fullSecret = Buffer.from(secret.slice(2), "hex");
    }

    async _mintPreCheck(id, amount, signer = undefined) {
        if (signer === undefined) {
            signer = this.owner;
        }

        const remainingItems =
            this.rarityConfig[id].endTokenId - this.rarityConfig[id].startTokenId + 1 - this.rarityNumMinted[id];
        const startTokenId = this.rarityConfig[id].startTokenId + this.rarityNumMinted[id];

        // Initial state
        for (let i = 0; i < Math.min(amount, remainingItems); i++) {
            const tokenId = startTokenId + i;
            await expect(this.contract.ownerOf(toBN(tokenId))).to.be.revertedWith(
                "ERC721: owner query for nonexistent token",
            );
        }

        return startTokenId;
    }

    async _mintPostCheck(id, amount, signer = undefined) {
        if (signer === undefined) {
            signer = this.owner;
        }

        const rarityNumMintedBefore = toBN(this.rarityNumMinted[id]);
        const purchasedItemsBefore = this.purchasedRanges.has(signer.address)
            ? this.purchasedRanges.get(signer.address)
            : [];

        // Checks and effects
        for (let i = 0; i < amount; i++) {
            const tokenId = this.rarityConfig[id].startTokenId + this.rarityNumMinted[id] + i;
            const ownerOf = await this.contract.ownerOf(tokenId);
            const tokenURI = await this.contract.tokenURI(tokenId);
            const secret = await this.contract.secret(tokenId);
            const expectedSecret = getSecretPieceFromId(tokenId, this.fullSecret, this.rarityConfig);

            expect(ownerOf).to.be.equal(signer.address);
            expect(tokenURI).to.be.equal(process.env.IPFS_PREFIX + tokenId + process.env.IPFS_SUFFIX);
            expect(secret).to.be.equal(bufferToHex(expectedSecret));
        }

        const rarityNumMintedAfter = await this.contract.rarityNumMinted(id);
        expect(rarityNumMintedAfter).to.be.equal(rarityNumMintedBefore.add(amount));

        const purchasedItemsAfter = await this.contract.connect(signer).getPurchasedRanges(signer.address);
        expect(purchasedItemsAfter.length).to.be.equal(purchasedItemsBefore.length + 1);
        expect(purchasedItemsAfter[purchasedItemsAfter.length - 1].startTokenId).to.be.equal(
            this.rarityConfig[id].startTokenId + this.rarityNumMinted[id],
        );
        expect(purchasedItemsAfter[purchasedItemsAfter.length - 1].amount).to.be.equal(amount);

        this.rarityNumMinted[id] += amount;
        this.purchasedRanges.set(signer.address, purchasedItemsAfter);
    }

    async getRemainingNFTs(id) {
        const remainingItemsContract = fromBN(await this.contract.getRemainingNFTs(id));

        const remainingItems =
            this.rarityConfig[id].endTokenId - this.rarityConfig[id].startTokenId + 1 - this.rarityNumMinted[id];

        expect(remainingItemsContract).to.be.equal(remainingItems);

        return remainingItems;
    }

    _encodeRarityConfig(rarityConfig) {
        return rarityConfig.map(item => {
            return {
                startTokenId: toBN(item.startTokenId),
                endTokenId: toBN(item.endTokenId),
                secretSegmentStart: toBN(item.secretSegmentStart),
                secretSegmentLength: toBN(item.secretSegmentLength),
                bytesPerPiece: toBN(item.bytesPerPiece),
            };
        });
    }

    _isValidId(id) {
        return id < this.rarityConfig.length && id >= 0;
    }
}

module.exports = { NFTPotionHelper };

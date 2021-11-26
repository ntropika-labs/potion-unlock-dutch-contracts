const { expect } = require("chai");
const { ethers } = require("hardhat");
const { toBN } = require("./NFTPotionAuctionUtils");
const { NFTPotionDutchAuctionHelper } = require("./NFTPotionDutchAuctionHelper");

class NFTPotionV2Helper {
    contract;
    owner;

    NFTPotionDutchAuction;

    ipfsPrefix;
    ipfsSuffix;
    fullSecret;
    encryptionKeysMap;
    rarityConfig;
    rarityConfigEncoded;
    rarityNumMinted;

    // Globals
    currentItemsId;
    creditMap;

    // Contract State
    currentBatch;

    constructor(tokenName, tokenSymbol, ipfsPrefix, ipfsSuffix, fullSecret, rarityConfig) {
        this.tokenName = tokenName;
        this.tokenSymbol = tokenSymbol;
        this.ipfsPrefix = ipfsPrefix;
        this.ipfsSuffix = ipfsSuffix;
        this.fullSecret = fullSecret;
        this.rarityConfig = rarityConfig;
        this.rarityNumMinted = new Array(rarityConfig.length).fill(0);
    }

    async initialize() {
        this.owner = await ethers.getSigners()[0];
        this.rarityConfigEncoded = this._encodeRarityConfig(this.rarityConfig);

        const NFTPotionV2 = await ethers.getContractFactory("NFTPotionV2");
        this.contract = await NFTPotionV2.deploy(
            this.tokenName,
            this.tokenSymbol,
            this.ipfsPrefix,
            this.ipfsSuffix,
            this.fullSecret,
            this.rarityConfigEncoded,
        );
        await this.contract.deployed();

        this.NFTPotionDutchAuction = new NFTPotionDutchAuctionHelper(this);
    }

    async startAuction(id, purchasePrice, signer) {
        await this.NFTPotionDutchAuction.startAuction(id, purchasePrice, signer);
    }

    async stopAuction(id, purchasePrice, signer) {
        await this.NFTPotionDutchAuction.stopAuction(id, purchasePrice, signer);
    }

    async changePrice(newPrice, signer) {
        await this.NFTPotionDutchAuction.changePrice(newPrice, signer);
    }

    async purchase(amount, publicKey, signer) {
        if (signer === undefined) {
            signer = this.owner;
        }

        // Initial state
        const itemsId = this.NFTPotionDutchAuction.itemsId;
        for (let i = 0; i < amount; i++) {
            const tokenId = this.rarityConfig[itemsId].startTokenId + this.rarityNumMinted[itemsId] + i;
            const ownerOf = await this.contract.ownerOf(tokenId);

            expect(ownerOf).to.be.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
        }

        const rarityNumMintedBefore = await this.contract.rarityNumMinted(itemsId);

        // Logic
        const purchasedAmount = await this.NFTPotionDutchAuction.purchase(amount, publicKey, signer);

        // Checks and effects
        for (let i = 0; i < amount; i++) {
            const itemsId = this.NFTPotionDutchAuction.itemsId;
            const tokenId = this.rarityConfig[itemsId].startTokenId + this.rarityNumMinted[itemsId] + i;
            const ownerOf = await this.contract.ownerOf(tokenId);

            expect(ownerOf).to.be.equal(signer.address);
        }

        const rarityNumMintedAfter = await this.contract.rarityNumMinted(itemsId);
        expect(rarityNumMintedAfter).to.be.equal(rarityNumMintedBefore + purchasedAmount);
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

    _getRemainingItems(id) {
        return this.rarityConfig[id].endTokenId - this.rarityConfig[id].startTokenId + 1 - this.rarityNumMinted[id];
    }

    _isValidId(id) {
        return id < this.rarityConfig.length && id >= 0;
    }
}

module.exports = { NFTPotionV2Helper };

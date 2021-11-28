const { expect } = require("chai");
const { ethers } = require("hardhat");
const { toBN, fromBN } = require("./NFTPotionAuctionUtils");
const { NFT_NAME, NFT_SYMBOL, IPFS_PREFIX, IPFS_SUFFIX } = require("../scripts/config");
const { encryptPassword, getRaritiesConfig, encodeRarityConfig } = require("../scripts/lib/utils");

const { NFTPotionDutchAuctionHelper } = require("./NFTPotionDutchAuctionHelper");
const { NFTPotionFundsHelper } = require("./NFTPotionFundsHelper");
const { NFTPotionAccessListHelper } = require("./NFTPotionAccessListHelper");
const { NFTPotionCreditHelper } = require("./NFTPotionCreditHelper");

class NFTPotionV2Helper {
    contract;
    owner;

    NFTPotionV2;
    NFTPotionDutchAuction;
    NFTPotionFunds;
    NFTPotionAccessList;
    NFTPotionCredit;

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

    constructor() {
        this.tokenName = NFT_NAME;
        this.tokenSymbol = NFT_SYMBOL;
        this.ipfsPrefix = IPFS_PREFIX;
        this.ipfsSuffix = IPFS_SUFFIX;
        this.rarityConfig = getRaritiesConfig();
        this.rarityConfigEncoded = encodeRarityConfig(this.rarityConfig);
        this.rarityNumMinted = new Array(this.rarityConfig.length).fill(0);
        this.fullSecret = encryptPassword(process.env.PASSWORD_GENESIS);
    }

    async initialize() {
        this.owner = (await ethers.getSigners())[0];

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

        this.NFTPotionV2 = this.contract;
        this.NFTPotionFunds = new NFTPotionFundsHelper(this);
        this.NFTPotionAccessList = new NFTPotionAccessListHelper(this);
        this.NFTPotionCredit = new NFTPotionCreditHelper(this);
        this.NFTPotionDutchAuction = new NFTPotionDutchAuctionHelper(this);

        await this.NFTPotionFunds.initialize();
        await this.NFTPotionAccessList.initialize();
        await this.NFTPotionCredit.initialize();
        await this.NFTPotionDutchAuction.initialize();
    }

    async startAuction(id, purchasePrice, signer = undefined) {
        return this.NFTPotionDutchAuction.startAuction(id, purchasePrice, signer);
    }

    async stopAuction(signer = undefined) {
        return this.NFTPotionDutchAuction.stopAuction(signer);
    }

    async changePrice(id, newPrice, signer = undefined) {
        return this.NFTPotionDutchAuction.changePrice(id, newPrice, signer);
    }

    async purchase(id, amount, limitPrice, publicKey, sendValue = undefined, signer = undefined) {
        if (signer === undefined) {
            signer = this.owner;
        }

        // Initial state
        for (let i = 0; i < amount; i++) {
            const tokenId = this.rarityConfig[id].startTokenId + this.rarityNumMinted[id] + i;
            await expect(this.contract.ownerOf(toBN(tokenId))).to.be.revertedWith(
                "ERC721: owner query for nonexistent token",
            );
        }

        const rarityNumMintedBefore = await this.contract.rarityNumMinted(id);

        // Logic+3
        const purchasedAmount = await this.NFTPotionDutchAuction.purchase(
            id,
            amount,
            limitPrice,
            publicKey,
            sendValue,
            signer,
        );

        // Checks and effects
        for (let i = 0; i < amount; i++) {
            const tokenId = this.rarityConfig[id].startTokenId + this.rarityNumMinted[id] + i;
            const ownerOf = await this.contract.ownerOf(tokenId);

            expect(ownerOf).to.be.equal(signer.address);
        }

        const rarityNumMintedAfter = await this.contract.rarityNumMinted(id);
        expect(rarityNumMintedAfter).to.be.equal(rarityNumMintedBefore.add(purchasedAmount));

        this.rarityNumMinted[id] += amount;
    }

    async purchasePrice() {
        return this.NFTPotionDutchAuction.purchasePrice;
    }

    async getRemainingItems(id) {
        const remainingItemsContract = fromBN(await this.contract.getRemainingItems(id));

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

module.exports = { NFTPotionV2Helper };

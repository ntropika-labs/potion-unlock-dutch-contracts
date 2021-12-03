const { expect } = require("chai");
const { ethers } = require("hardhat");
const { bufferToHex } = require("ethereumjs-util");
const { toBN, fromBN } = require("./NFTPotionAuctionUtils");
const { NFT_NAME, NFT_SYMBOL, IPFS_PREFIX, IPFS_SUFFIX } = require("../scripts/config");
const {
    encryptPassword,
    getRaritiesConfig,
    encodeRarityConfig,
    getSecretPieceFromId,
} = require("../scripts/lib/utils");

const { NFTPotionDutchAuctionHelper } = require("./NFTPotionDutchAuctionHelper");
const { NFTPotionFundsHelper } = require("./NFTPotionFundsHelper");
const { NFTPotionAccessListHelper } = require("./NFTPotionAccessListHelper");
const { NFTPotionCreditHelper } = require("./NFTPotionCreditHelper");

class NFTPotionHelper {
    contract;
    owner;

    NFTPotion;
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

    constructor(contract = undefined) {
        this.tokenName = NFT_NAME;
        this.tokenSymbol = NFT_SYMBOL;
        this.ipfsPrefix = IPFS_PREFIX;
        this.ipfsSuffix = IPFS_SUFFIX;
        this.rarityConfig = getRaritiesConfig();
        this.rarityConfigEncoded = encodeRarityConfig(this.rarityConfig);
        this.rarityNumMinted = new Array(this.rarityConfig.length).fill(0);

        this.contract = contract;
    }

    async initialize() {
        this.owner = (await ethers.getSigners())[0];

        if (this.contract === undefined) {
            const encryptedPassword = encryptPassword(process.env.PASSWORD_GENESIS);
            this.fullSecret = Buffer.from(encryptedPassword.slice(2), "hex");

            const NFTPotion = await ethers.getContractFactory("NFTPotion");
            this.contract = await NFTPotion.deploy(
                this.tokenName,
                this.tokenSymbol,
                this.ipfsPrefix,
                this.ipfsSuffix,
                this.fullSecret,
                this.rarityConfigEncoded,
            );
            await this.contract.deployed();
        } else {
            const secret = await this.contract.fullSecret();
            this.fullSecret = Buffer.from(secret.slice(2), "hex");
        }

        this.NFTPotion = this.contract;
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

        const remainingItems = await this.getRemainingNFTs(id);
        const startTokenId = this.rarityConfig[id].startTokenId + this.rarityNumMinted[id];

        // Initial state
        for (let i = 0; i < Math.min(amount, remainingItems); i++) {
            const tokenId = startTokenId + i;
            await expect(this.contract.ownerOf(toBN(tokenId))).to.be.revertedWith(
                "ERC721: owner query for nonexistent token",
            );
        }

        const rarityNumMintedBefore = await this.contract.rarityNumMinted(id);

        // Logic
        const { tx, amountToPurchase: purchasedAmount } = await this.NFTPotionDutchAuction.purchase(
            id,
            amount,
            limitPrice,
            publicKey,
            sendValue,
            signer,
        );

        await expect(tx)
            .to.emit(this.contract, "NFTPurchased")
            .withArgs(signer.address, startTokenId, purchasedAmount, limitPrice, publicKey);

        // Checks and effects
        for (let i = 0; i < purchasedAmount; i++) {
            const tokenId = this.rarityConfig[id].startTokenId + this.rarityNumMinted[id] + i;
            const ownerOf = await this.contract.ownerOf(tokenId);
            const tokenURI = await this.contract.tokenURI(tokenId);
            const secret = await this.contract.secret(tokenId);
            const expectedSecret = getSecretPieceFromId(tokenId, this.fullSecret, this.rarityConfig);

            expect(ownerOf).to.be.equal(signer.address);
            expect(tokenURI).to.be.equal(IPFS_PREFIX + tokenId + IPFS_SUFFIX);
            expect(secret).to.be.equal(bufferToHex(expectedSecret));
        }

        const rarityNumMintedAfter = await this.contract.rarityNumMinted(id);
        expect(rarityNumMintedAfter).to.be.equal(rarityNumMintedBefore.add(purchasedAmount));

        this.rarityNumMinted[id] += purchasedAmount;

        return purchasedAmount;
    }

    async purchasePrice() {
        return this.NFTPotionDutchAuction.purchasePrice;
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

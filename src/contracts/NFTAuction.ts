import NFTAuctionJSON from "../artifacts/contracts/NFTPotionAuction.sol/NFTPotionAuction.json";
import { Contract, ethers, BigNumber } from "ethers";
import { getDefaultProvider, getWeb3Provider } from "../utils/provider";

const Deployments = require("../deployments.json");

export interface IBatchData {
    auctionEndDate: BigNumber;
    minimumPricePerToken: BigNumber;
    startTokenId: BigNumber;
    numTokensAuctioned: BigNumber;
    highestBid: BigNumber;
    numBidders: BigNumber;
}

export class BatchData implements IBatchData, Object {
    auctionEndDate: BigNumber;
    minimumPricePerToken: BigNumber;
    startTokenId: BigNumber;
    numTokensAuctioned: BigNumber;
    highestBid: BigNumber;
    numBidders: BigNumber;

    constructor(values: BigNumber[]) {
        this.auctionEndDate = values[0];
        this.minimumPricePerToken = values[1];
        this.startTokenId = values[2];
        this.numTokensAuctioned = values[3];
        this.highestBid = values[4];
        this.numBidders = values[5];
    }

    toString(): string {
        return `End Date: ${this.auctionEndDate}
                Minimum Price: ${this.minimumPricePerToken}
                Start Token ID: ${this.startTokenId}
                Num. Tokens Auctioned: ${this.numTokensAuctioned}
                Highest Bid: ${this.highestBid}
                Num. Bidders: ${this.numBidders}`;
    }
}

export class NFTAuction {
    myAccount: string;
    provider: ethers.providers.Web3Provider;
    signer?: ethers.Signer;
    contract: Contract;
    signed: boolean;

    constructor() {
        this.provider = getDefaultProvider();
        this.contract = new Contract(Deployments.NFTAuction, NFTAuctionJSON.abi, this.provider);
        this.myAccount = "";
        this.signed = false;
    }

    unlockWallet(provider: any, account: string) {
        const newProvider = getWeb3Provider(provider);

        this.signer = newProvider.getSigner(0);
        this.myAccount = account;
        this.contract = this.contract.connect(this.signer);
        this.signed = true;
    }

    get isUnlocked(): boolean {
        return !!this.myAccount;
    }

    async validate(tokenId: number, decryptedSecret: string, proof: string) {
        return this.contract.validate(tokenId, decryptedSecret, JSON.parse(proof));
    }

    async startBatch(startTokenId: number, endTokenId: number, minimumPricePerToken: string, auctionEndDate: number) {
        return this.contract.startBatch(startTokenId, endTokenId, BigNumber.from(minimumPricePerToken), auctionEndDate);
    }

    async endBatch() {
        return this.contract.endBatch();
    }

    async setBid(numTokens: string, pricePerToken: string) {
        return this.contract.setBid(BigNumber.from(numTokens), BigNumber.from(pricePerToken));
    }

    async cancelBid() {
        return this.contract.cancelBid();
    }

    async claimRefund() {
        return this.contract.claimRefund();
    }

    async refundAmount() {
        return this.contract.refunds(this.myAccount);
    }

    async listBidders() {
        return this.contract.listBidders();
    }

    async currentBatch() {
        return this.contract.currentBatch();
    }

    async getLatestBid() {
        return this.contract.getLatestBid(this.myAccount);
    }

    async getWhitelistRanges() {
        return this.contract.getWhitelistRanges(this.myAccount);
    }

    async claimableFunds() {
        return this.contract.claimableFunds();
    }

    async transferFunds(recipient: string) {
        return this.contract.transferFunds(recipient);
    }
}

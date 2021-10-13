import SVGNFTJSON from "../artifacts/contracts/SVGNFT.sol/SVGNFT.json";
import { Contract, ethers } from "ethers";
import { getDefaultProvider, getWeb3Provider } from "../utils/provider";

const Deployments = require("../deployments.json");

export class SVGNFT {
    myAccount: string;
    provider: ethers.providers.Web3Provider;
    signer?: ethers.Signer;
    contract: Contract;
    signed: boolean;

    constructor() {
        this.provider = getDefaultProvider();
        this.contract = new Contract(Deployments.NFTContract, SVGNFTJSON.abi, this.provider);
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

    async mint(publicKey: string) {
        return this.contract.mint(publicKey);
    }

    async secret(tokenId: number) {
        return this.contract.secret(tokenId);
    }

    async fullSecret() {
        return this.contract.fullSecret();
    }

    async nextTokenId() {
        return this.contract.nextTokenId();
    }

    async encryptionKeys(tokenId: number) {
        return this.contract.encryptionKeys(tokenId);
    }

    async tokenURI(tokenId: number) {
        const tokenURI = await this.contract.tokenURI(tokenId);
        console.log(tokenURI);
        return tokenURI;
    }
}

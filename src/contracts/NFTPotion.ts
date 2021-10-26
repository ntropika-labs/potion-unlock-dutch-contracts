import NFTpotionJSON from "../artifacts/contracts/NFTPotion.sol/NFTPotion.json";
import { BigNumber, Contract, ethers } from "ethers";
import { getDefaultProvider, getWeb3Provider } from "../utils/provider";

const Deployments = require("../deployments.json");

export class NFTPotion {
    myAccount: string;
    provider: ethers.providers.Web3Provider;
    signer?: ethers.Signer;
    contract: Contract;
    signed: boolean;

    constructor() {
        this.provider = getDefaultProvider();
        this.contract = new Contract(Deployments.NFTPotion, NFTpotionJSON.abi, this.provider);
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

    async mint(tokenId: BigNumber, publicKey: string) {
        return this.contract.mint(publicKey);
    }
    async mintList(tokenIds: BigNumber[], publicKey: string) {
        return this.contract.mintList(tokenIds, publicKey);
    }
    async secret(tokenId: number) {
        return this.contract.secret(tokenId);
    }

    async fullSecret() {
        return this.contract.fullSecret();
    }

    async numMintedTokens() {
        return this.contract.numMintedTokens();
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

import SVGNFTJSON from "../artifacts/contracts/SVGNFT.sol/SVGNFT.json";
import { Contract, ethers } from "ethers";
import { getDefaultProvider, getWeb3Provider } from "../utils/provider";

const SVGNFTAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export class SVGNFT {
    myAccount: string;
    provider: ethers.providers.Web3Provider;
    signer?: ethers.Signer;
    contract: Contract;
    signed: boolean;

    constructor() {
        this.provider = getDefaultProvider();
        this.contract = new Contract(SVGNFTAddress, SVGNFTJSON.abi, this.provider);
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

    async mint(tokenURI: string, publicKey: string) {
        const ecdsaKey = Buffer.from(publicKey, "base64");
        console.log(ecdsaKey);
        const key = ecdsaKey.slice(1);
        console.log(key);
        return this.contract.mint(tokenURI, key);
    }

    async secret(tokenId: number) {
        return this.contract.secret(tokenId);
    }

    async tokenURI(tokenId: number) {
        return this.contract.tokenURI(tokenId);
    }
}

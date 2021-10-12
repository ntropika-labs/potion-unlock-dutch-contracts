import NFTValidatorJSON from "../artifacts/contracts/NFTValidator.sol/NFTValidator.json";
import { Contract, ethers } from "ethers";
import { getDefaultProvider, getWeb3Provider } from "../utils/provider";

const NFTValidatorAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

export class NFTValidator {
    myAccount: string;
    provider: ethers.providers.Web3Provider;
    signer?: ethers.Signer;
    contract: Contract;
    signed: boolean;

    constructor() {
        this.provider = getDefaultProvider();
        this.contract = new Contract(NFTValidatorAddress, NFTValidatorJSON.abi, this.provider);
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
        console.log(JSON.parse(proof));
        return this.contract.validate(tokenId, decryptedSecret, JSON.parse(proof));
    }

    async getMessage() {
        return this.contract.getMessage();
    }
}

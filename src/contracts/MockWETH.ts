import MockWETHJSON from "../artifacts/contracts/mock/MockWETH.sol/MockWETH.json";
import { Contract, ethers, BigNumber } from "ethers";
import { getDefaultProvider, getWeb3Provider } from "../utils/provider";

const Deployments = require("../deployments.json");

export class MockWETH {
    myAccount: string;
    provider: ethers.providers.Web3Provider;
    signer?: ethers.Signer;
    contract: Contract;
    signed: boolean;

    constructor() {
        this.provider = getDefaultProvider();
        this.contract = new Contract(Deployments.MockWETH, MockWETHJSON.abi, this.provider);
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

    async increaseAllowance(spender: string, addedValue: BigNumber) {
        return this.contract.increaseAllowance(spender, addedValue);
    }
}

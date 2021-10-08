import SimpleContractJSON from '../artifacts/contracts/SimpleContract.sol/SimpleContract.json';
import { Contract, ethers } from 'ethers';
import { getDefaultProvider, getWeb3Provider } from '../utils/provider';
import { parseUnits } from 'ethers/lib/utils';

const simpleContractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

export class SimpleContract {
    myAccount: string;
    provider: ethers.providers.Web3Provider;
    signer?: ethers.Signer;
    contract: Contract;
    signed: boolean;

    constructor() {
        this.provider = getDefaultProvider();
        this.contract = new Contract(simpleContractAddress, SimpleContractJSON.abi, this.provider)
        this.myAccount = '';
        this.signed = false;
    }

    unlockWallet(provider: any, account: string) {
        const newProvider = getWeb3Provider(provider);

        this.signer = newProvider.getSigner(0);
        this.myAccount = account;
        this.contract = this.contract.connect(this.signer);
        this.signed = true;
    }

    async increment() {
        return this.contract.increment();
    }

    async incrementBy(amount: string) {
        return this.contract.incrementBy(parseUnits(amount, "wei"));
    }

    async value() {
        return this.contract.value();
    }

    get isUnlocked(): boolean {
        return !!this.myAccount;
    }
}

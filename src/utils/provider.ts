import { ethers } from 'ethers';
import { web3ProviderFrom } from './ether-utils';

export const ChainId = 1337;

export function getDefaultProvider(): ethers.providers.Web3Provider {
    return new ethers.providers.Web3Provider(
        web3ProviderFrom('http://localhost:8545'),
        ChainId
    );
}

export function getWeb3Provider(provider: any): ethers.providers.Web3Provider {
    return new ethers.providers.Web3Provider(provider, ChainId);
}
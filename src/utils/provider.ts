import { ethers } from "ethers";
import { web3ProviderFrom } from "./ether-utils";

export function getDefaultProvider(): ethers.providers.Web3Provider {
    const ChainID = process.env.REACT_APP_CHAIN_ID !== undefined ? parseInt(process.env.REACT_APP_CHAIN_ID) : 1337;
    const Provider =
        process.env.REACT_APP_WEB3_PROVIDER_URL !== undefined
            ? process.env.REACT_APP_WEB3_PROVIDER_URL
            : "https://localhost:8545";
    console.log(`Provider: ${Provider}`);
    console.log(`ChainID: ${ChainID}`);
    return new ethers.providers.Web3Provider(web3ProviderFrom(Provider), ChainID);
}

export function getWeb3Provider(provider: any): ethers.providers.Web3Provider {
    const ChainID = process.env.REACT_APP_CHAIN_ID !== "" ? parseInt(process.env.REACT_APP_CHAIN_ID) : 1337;
    return new ethers.providers.Web3Provider(provider, ChainID);
}

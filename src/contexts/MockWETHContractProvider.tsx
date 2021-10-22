import React, { createContext, useEffect, useState } from "react";
import { MockWETH } from "../contracts";
import { useWallet } from "@binance-chain/bsc-use-wallet";

export interface MockWETHContext {
    MockWETHContract?: MockWETH;
    lastError: string;
}

export const Context = createContext<MockWETHContext>({ MockWETHContract: null, lastError: "" });

export const MockWETHContractProvider: React.FC = ({ children }) => {
    const { ethereum, account } = useWallet();
    const [MockWETHContract, setNFTAuctionContract] = useState<MockWETH>();

    useEffect(() => {
        let MockWETHContractInstance;

        if (!MockWETHContract) {
            MockWETHContractInstance = new MockWETH();
            setNFTAuctionContract(MockWETHContractInstance);
        } else {
            MockWETHContractInstance = MockWETHContract;
        }
        if (account) {
            if (MockWETHContractInstance) {
                MockWETHContractInstance.unlockWallet(ethereum, account);
            }
        }
    }, [account, MockWETHContract, ethereum]);

    return <Context.Provider value={{ MockWETHContract, lastError: "" }}>{children}</Context.Provider>;
};

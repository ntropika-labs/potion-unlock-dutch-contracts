import React, { createContext, useEffect, useState } from "react";
import { NFTPotion } from "../contracts";
import { useWallet } from "@binance-chain/bsc-use-wallet";

export interface NFTPotionContext {
    NFTPotionContract?: NFTPotion;
    lastError: string;
}

export const Context = createContext<NFTPotionContext>({ NFTPotionContract: null, lastError: "" });

export const NFTPotionContractProvider: React.FC = ({ children }) => {
    const { ethereum, account } = useWallet();
    const [NFTPotionContract, setNFTPotionContract] = useState<NFTPotion>();

    useEffect(() => {
        let NFTPotionContractInstance;

        if (!NFTPotionContract) {
            NFTPotionContractInstance = new NFTPotion();
            setNFTPotionContract(NFTPotionContractInstance);
        } else {
            NFTPotionContractInstance = NFTPotionContract;
        }
        if (account) {
            if (NFTPotionContractInstance) {
                NFTPotionContractInstance.unlockWallet(ethereum, account);
            }
        }
    }, [account, NFTPotionContract, ethereum]);

    return <Context.Provider value={{ NFTPotionContract, lastError: "" }}>{children}</Context.Provider>;
};

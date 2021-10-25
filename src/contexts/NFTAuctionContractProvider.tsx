import React, { createContext, useEffect, useState } from "react";
import { NFTAuction } from "../contracts";
import { useWallet } from "@binance-chain/bsc-use-wallet";

export interface NFTAuctionContext {
    NFTAuctionContract?: NFTAuction;
    lastError: string;
}

export const Context = createContext<NFTAuctionContext>({ NFTAuctionContract: null, lastError: "" });

export const NFTAuctionContractProvider: React.FC = ({ children }) => {
    const { ethereum, account } = useWallet();
    const [NFTAuctionContract, setNFTAuctionContract] = useState<NFTAuction>();

    useEffect(() => {
        let NFTAuctionContractInstance;

        if (!NFTAuctionContract) {
            NFTAuctionContractInstance = new NFTAuction();
            setNFTAuctionContract(NFTAuctionContractInstance);
        } else {
            NFTAuctionContractInstance = NFTAuctionContract;
        }
        if (account) {
            if (NFTAuctionContractInstance) {
                NFTAuctionContractInstance.unlockWallet(ethereum, account);
            }
        }
    }, [account, NFTAuctionContract, ethereum]);

    return <Context.Provider value={{ NFTAuctionContract, lastError: "" }}>{children}</Context.Provider>;
};

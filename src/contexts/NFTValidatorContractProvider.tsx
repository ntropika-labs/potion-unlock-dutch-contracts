import React, { createContext, useEffect, useState } from "react";
import { NFTPotionValidator } from "../contracts";
import { useWallet } from "@binance-chain/bsc-use-wallet";

export interface NFTValidatorContext {
    NFTValidatorContract?: NFTPotionValidator;
    lastError: string;
}

export const Context = createContext<NFTValidatorContext>({ NFTValidatorContract: null, lastError: "" });

export const NFTValidatorContractProvider: React.FC = ({ children }) => {
    const { ethereum, account } = useWallet();
    const [NFTValidatorContract, setNFTValidatorContract] = useState<NFTPotionValidator>();

    useEffect(() => {
        let NFTValidatorContractInstance;

        if (!NFTValidatorContract) {
            NFTValidatorContractInstance = new NFTPotionValidator();
            setNFTValidatorContract(NFTValidatorContractInstance);
        } else {
            NFTValidatorContractInstance = NFTValidatorContract;
        }
        if (account) {
            if (NFTValidatorContractInstance) {
                NFTValidatorContractInstance.unlockWallet(ethereum, account);
            }
        }
    }, [account, NFTValidatorContract, ethereum]);

    return <Context.Provider value={{ NFTValidatorContract, lastError: "" }}>{children}</Context.Provider>;
};

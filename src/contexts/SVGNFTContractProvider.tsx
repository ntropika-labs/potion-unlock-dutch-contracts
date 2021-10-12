import React, { createContext, useEffect, useState } from "react";
import { SVGNFT } from "../contracts";
import { useWallet } from "@binance-chain/bsc-use-wallet";

export interface SVGNFTContext {
    NFTValidatorContract?: SVGNFT;
    lastError: string;
}

export const Context = createContext<SVGNFTContext>({ NFTValidatorContract: null, lastError: "" });

export const SVGNFTContractProvider: React.FC = ({ children }) => {
    const { ethereum, account } = useWallet();
    const [SVGNFTContract, setSVGNFTContract] = useState<SVGNFT>();

    useEffect(() => {
        let SVGNFTContractInstance;

        if (!SVGNFTContract) {
            SVGNFTContractInstance = new SVGNFT();
            setSVGNFTContract(SVGNFTContractInstance);
        } else {
            SVGNFTContractInstance = SVGNFTContract;
        }
        if (account) {
            if (SVGNFTContractInstance) {
                SVGNFTContractInstance.unlockWallet(ethereum, account);
            }
        }
    }, [account, SVGNFTContract, ethereum]);

    return (
        <Context.Provider value={{ NFTValidatorContract: SVGNFTContract, lastError: "" }}>{children}</Context.Provider>
    );
};

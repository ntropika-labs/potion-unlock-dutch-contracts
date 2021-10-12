import React from "react";
import { withGlobalState } from "react-globally";
import { SVGNFTContractProvider } from "./contexts/SVGNFTContractProvider";
import { NFTValidatorContractProvider } from "./contexts/NFTValidatorContractProvider";

import { UseWalletProvider } from "@binance-chain/bsc-use-wallet";
import { ChainId } from "./utils/provider";

import Main from "./views/Main";

const App: React.FC<any> = props => {
    return (
        <UseWalletProvider chainId={ChainId}>
            <SVGNFTContractProvider>
                <NFTValidatorContractProvider>
                    <Main />
                </NFTValidatorContractProvider>
            </SVGNFTContractProvider>
        </UseWalletProvider>
    );
};

export default withGlobalState(App);

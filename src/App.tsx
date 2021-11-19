import React from "react";
import { withGlobalState } from "react-globally";
import { NFTPotionContractProvider } from "./contexts/NFTPotionContractProvider";
import { NFTValidatorContractProvider } from "./contexts/NFTValidatorContractProvider";
import { NFTAuctionContractProvider } from "./contexts/NFTAuctionContractProvider";
import { UseWalletProvider } from "@binance-chain/bsc-use-wallet";

import Main from "./views/Main";

const App: React.FC<any> = props => {
    return (
        <UseWalletProvider
            chainId={process.env.REACT_APP_CHAIN_ID !== "" ? parseInt(process.env.REACT_APP_CHAIN_ID) : 1337}
        >
            <NFTPotionContractProvider>
                <NFTValidatorContractProvider>
                    <NFTAuctionContractProvider>
                        <Main />
                    </NFTAuctionContractProvider>
                </NFTValidatorContractProvider>
            </NFTPotionContractProvider>
        </UseWalletProvider>
    );
};

export default withGlobalState(App);

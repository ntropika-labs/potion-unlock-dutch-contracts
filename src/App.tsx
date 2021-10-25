import React from "react";
import { withGlobalState } from "react-globally";
import { NFTPotionContractProvider } from "./contexts/NFTPotionContractProvider";
import { NFTValidatorContractProvider } from "./contexts/NFTValidatorContractProvider";
import { NFTAuctionContractProvider } from "./contexts/NFTAuctionContractProvider";
import { MockWETHContractProvider } from "./contexts/MockWETHContractProvider";

import { UseWalletProvider } from "@binance-chain/bsc-use-wallet";
import { ChainId } from "./utils/provider";

import Main from "./views/Main";

const App: React.FC<any> = props => {
    return (
        <UseWalletProvider chainId={ChainId}>
            <NFTPotionContractProvider>
                <NFTValidatorContractProvider>
                    <NFTAuctionContractProvider>
                        <MockWETHContractProvider>
                            <Main />
                        </MockWETHContractProvider>
                    </NFTAuctionContractProvider>
                </NFTValidatorContractProvider>
            </NFTPotionContractProvider>
        </UseWalletProvider>
    );
};

export default withGlobalState(App);

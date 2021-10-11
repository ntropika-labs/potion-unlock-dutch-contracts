import React from 'react';
import { withGlobalState } from 'react-globally';
import { SVGNFTContractProvider } from './contexts/SVGNFTContractProvider'

import { UseWalletProvider } from '@binance-chain/bsc-use-wallet';
import { ChainId } from './utils/provider'

import Main from './views/Main';

const App: React.FC<any> = (props) => {
  return (
    <UseWalletProvider chainId={ChainId}>
      <SVGNFTContractProvider>
        <Main/>
      </SVGNFTContractProvider>
    </UseWalletProvider>
  );
};

export default withGlobalState(App);

import React from 'react';
import { withGlobalState } from 'react-globally';
import { SimpleContractProvider } from './contexts/SimpleContractProvider'

import { UseWalletProvider } from '@binance-chain/bsc-use-wallet';
import { ChainId } from './utils/provider'

import Main from './views/Main';

const App: React.FC<any> = (props) => {
  return (
    <UseWalletProvider chainId={ChainId}>
      <SimpleContractProvider>
        <Main/>
      </SimpleContractProvider>
    </UseWalletProvider>
  );
};

export default withGlobalState(App);

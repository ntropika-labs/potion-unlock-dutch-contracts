import React, { createContext, useEffect, useState } from 'react';
import { SimpleContract } from '../contracts';
import { useWallet } from '@binance-chain/bsc-use-wallet';

export interface SimpleContractContext {
  simpleContract?: SimpleContract;
  lastError: string;
}

export const Context = createContext<SimpleContractContext>({ simpleContract: null, lastError:'' });

export const SimpleContractProvider: React.FC = ({ children }) => {
  const { ethereum, account } = useWallet();
  const [simpleContract, setSimpleContract] = useState<SimpleContract>();

  useEffect(() => {
    let simpleContractInstance;

    if (!simpleContract) {
      simpleContractInstance = new SimpleContract();
      setSimpleContract(simpleContractInstance);
    } else {
      simpleContractInstance = simpleContract;
    }
    if (account) {
      if (simpleContractInstance) {
        simpleContractInstance.unlockWallet(ethereum, account);
      }
    }
  }, [account, simpleContract, ethereum]);

  return <Context.Provider value={{ simpleContract, lastError: '' }}>{children}</Context.Provider>;
};

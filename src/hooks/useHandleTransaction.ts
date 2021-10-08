import { useCallback } from 'react';
import { TransactionResponse } from '@ethersproject/providers';

const useHandleTransaction = (props: any) => {
  return useCallback((promise: Promise<TransactionResponse>):any => {
    promise
    .then((tx) => { return tx; })
    .catch((err) => {
        if (typeof(err.data) != 'undefined' && typeof(err.data.message) === 'string' ){
          props.setGlobalState({ lastError: err.data.message });
        } else if (typeof(err.message) === 'string' ) {
          props.setGlobalState({ lastError: err.message });
        } else if (typeof(err) === 'string' ) {
          props.setGlobalState({ lastError: err });
        } else {
          props.setGlobalState({ lastError: "Unknown error occurred: check the console" });
        }
    });
  },[props],
  );
};

export default useHandleTransaction;
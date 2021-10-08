import { useCallback } from 'react';
import useSimpleContract from './useSimpleContract';
import useHandleTransaction from './useHandleTransaction';

const useSimpleIncrementBy = (props: any) => {
  const handleTransaction = useHandleTransaction(props);
  const simple = useSimpleContract();
  
  const handleIncrementBy = useCallback((amount: string) => {
    handleTransaction(simple.incrementBy(amount));
  },[simple, handleTransaction],
  );
  return { onIncrementBy: handleIncrementBy };
};

export default useSimpleIncrementBy;

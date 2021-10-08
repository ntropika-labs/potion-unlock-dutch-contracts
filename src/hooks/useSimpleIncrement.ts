import { useCallback } from 'react';
import useSimpleContract from './useSimpleContract';
import useHandleTransaction from './useHandleTransaction';

const useSimpleIncrement = (props: any) => {
  const handleTransaction = useHandleTransaction(props);
  const simple = useSimpleContract();
  
  const handleIncrement = useCallback(async () => {
    handleTransaction(simple.increment());
  },[simple, handleTransaction],
  );
  return { onIncrement: handleIncrement };
};

export default useSimpleIncrement;

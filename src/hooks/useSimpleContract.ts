import { useContext } from 'react';
import { Context } from '../contexts/SimpleContractProvider';

const useSimpleContract = () => {
  const { simpleContract } = useContext(Context);
  return simpleContract;
};

export default useSimpleContract;

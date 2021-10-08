import { useWallet } from '@binance-chain/bsc-use-wallet';
import { useCallback } from 'react';

const Wallet: React.FC = () => {
  const { account, connect } = useWallet()
  
  const connectWallet = useCallback(() => {
    connect('injected');
  }, [connect]);

  return (
    <div>
      {!account && <button type="button" className="btn btn-primary" onClick={connectWallet}>Connect Wallet</button>}
    </div>
  );
};

export default Wallet;
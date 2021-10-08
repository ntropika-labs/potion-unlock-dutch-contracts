import Wallet from '../../components/Wallet';
import { withGlobalState } from 'react-globally';
import SimpleContract from '../../components/SimpleContract';
import { useWallet } from '@binance-chain/bsc-use-wallet';

const Main: React.FC<any> = (props) => {
  const { account,} = useWallet()

  return (
    <div>
      <Wallet/>
      { account && <SimpleContract/>}
    </div>
  );
};

export default withGlobalState(Main);
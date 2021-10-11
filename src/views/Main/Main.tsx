import Wallet from '../../components/Wallet';
import { withGlobalState } from 'react-globally';
import PublicKey from '../../components/PublicKey';
import Encrypt from '../../components/Encrypt';
import Decrypt from '../../components/Decrypt';
import SVGNFT from '../../components/SVGNFT';
import { useWallet } from '@binance-chain/bsc-use-wallet';

const Main: React.FC<any> = (props) => {
  const { account,} = useWallet()

  return (
    <div>
      <Wallet/>
      { account && <PublicKey/>}
      { account && <Encrypt/>}
      { account && <Decrypt/>}
      { account && <SVGNFT/>}
    </div>
  );
};

export default withGlobalState(Main);
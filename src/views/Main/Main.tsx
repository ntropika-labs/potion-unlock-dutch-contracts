import Wallet from "../../components/Wallet";
import { withGlobalState } from "react-globally";
import PublicKey from "../../components/PublicKey";
import SVGNFT from "../../components/SVGNFT";
import { useWallet } from "@binance-chain/bsc-use-wallet";
import NFTValidator from "../../components/NFTValidator";

const Main: React.FC<any> = props => {
    const { account } = useWallet();

    return (
        <div>
            <Wallet />

            {account && <PublicKey />}
            {account && <SVGNFT />}
            {/* {account && <NFTValidator />} */}
        </div>
    );
};

export default withGlobalState(Main);

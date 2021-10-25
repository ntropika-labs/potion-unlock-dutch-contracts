import Wallet from "../../components/Wallet";
import { withGlobalState } from "react-globally";
import PublicKey from "../../components/PublicKey";
import NFTContract from "../../components/NFTContract";
import { useWallet } from "@binance-chain/bsc-use-wallet";
import NFTValidator from "../../components/NFTValidator";
import NFTAuction from "../../components/NFTAuction";
import Decrypt from "../../components/Decrypt";

const Main: React.FC<any> = props => {
    const { account } = useWallet();

    return (
        <div>
            <Wallet />

            {/* {account && <PublicKey />} */}
            {account && <NFTAuction />}
            {/* {account && <Decrypt />}
            {account && <NFTContract />}
            {account && <NFTValidator />} */}
        </div>
    );
};

export default withGlobalState(Main);

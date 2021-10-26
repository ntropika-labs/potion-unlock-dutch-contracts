import Wallet from "../../components/Wallet";
import { withGlobalState } from "react-globally";
import PublicKey from "../../components/PublicKey";
import NFTContract from "../../components/NFTContract";
import { useWallet } from "@binance-chain/bsc-use-wallet";
import NFTValidator from "../../components/NFTValidator";
import NFTAuction from "../../components/NFTAuction";
import Decrypt from "../../components/Decrypt";
import { useCallback, useState } from "react";

const Main: React.FC<any> = props => {
    const { account } = useWallet();

    const [showAuction, setShowAuction] = useState<boolean>(true);
    const handleShowAuction = useCallback(() => {
        setShowAuction(!showAuction);
    }, [showAuction, setShowAuction]);

    return (
        <div>
            <Wallet />

            {account && (
                <div>
                    <button type="button" className="btn btn-primary" onClick={handleShowAuction}>
                        {showAuction ? "Show Game" : "Show Auction"}
                    </button>

                    {showAuction ? (
                        <NFTAuction />
                    ) : (
                        <div>
                            <PublicKey />
                            <Decrypt />
                            <NFTContract />
                            <NFTValidator />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default withGlobalState(Main);

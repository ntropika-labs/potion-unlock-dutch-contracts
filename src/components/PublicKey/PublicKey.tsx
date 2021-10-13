import { withGlobalState } from "react-globally";
import useMetamaskPublicKey from "../../hooks/useMetamaskPublicKey";

const PublicKey: React.FC<any> = props => {
    const { publicKey, onGetPublicKey } = useMetamaskPublicKey(props);

    return (
        <div className="main">
            <div className="container">
                <h1>Metamask Public Key</h1>
                <div className="row">
                    <div className="col-sm-12">
                        Key: {publicKey}
                        <br />
                        <button type="button" className="btn btn-primary" onClick={onGetPublicKey}>
                            Get Key
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default withGlobalState(PublicKey);

import { useCallback, useState } from "react";

import { withGlobalState } from "react-globally";
import useSVGNFTMinting from "../../hooks/useSVGNFTMinting";
import useSVGNFTData from "../../hooks/useSVGNFTData";
import useSVGNFTPublicKeys from "../../hooks/useSVGNFTPublicKeys";
import useSVGNFTFullSecret from "../../hooks/useSVGNFTFullSecret";

const SVGNFT: React.FC<any> = props => {
    const [tokenId, setTokenId] = useState<number>();

    const { secret, tokenURI, onGetData } = useSVGNFTData();
    const publicKeys = useSVGNFTPublicKeys();
    const { onMinting } = useSVGNFTMinting(props);

    const handleTokenIdChange = useCallback(
        event => {
            setTokenId(event.target.value);
        },
        [setTokenId],
    );

    const [publicKey, setPublicKey] = useState<string>();
    const handleMinting = useCallback(() => {
        onMinting();
    }, [onMinting]);

    const handlePublicKeyChange = useCallback(
        event => {
            setPublicKey(event.target.value);
        },
        [setPublicKey],
    );

    const handleGetData = useCallback(() => {
        onGetData(tokenId);
    }, [onGetData, tokenId]);

    const { fullSecret, onGetFullSecret } = useSVGNFTFullSecret();

    return (
        <div className="main">
            <div className="container">
                <h1>SVGNFT</h1>
                <div className="row">
                    <div className="col-sm-12">
                        <button type="button" className="btn btn-primary" onClick={handleMinting}>
                            Mint
                        </button>
                    </div>
                    <div className="row">
                        <div className="col-sm-12">
                            <h2>Collected Public Keys</h2>
                            <pre style={{ whiteSpace: "pre-wrap" }}>{publicKeys}</pre>
                        </div>
                    </div>
                </div>
                <div>
                    <h2>Minted NFTs</h2>
                    <p>Artwork</p>
                    <img src={tokenURI} alt="artwork" width="200" />
                    <p>TokenURI: {tokenURI}</p>
                    <p>Secret: {secret}</p>
                    <div className="form-group">
                        <label htmlFor="tokenId">Token ID</label>
                        <input type="string" className="form-control" id="tokenId" onChange={handleTokenIdChange} />
                    </div>
                    <button type="button" className="btn btn-primary" onClick={handleGetData}>
                        Get NFT Data
                    </button>
                </div>
                <div>
                    <h2>NFT Original Secret</h2>
                    <pre style={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}>{fullSecret}</pre>
                    <button type="button" className="btn btn-primary" onClick={onGetFullSecret}>
                        Get NFT Secret
                    </button>
                </div>
            </div>
        </div>
    );
};

export default withGlobalState(SVGNFT);

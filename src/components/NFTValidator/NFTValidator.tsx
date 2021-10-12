import { useCallback, useState } from "react";

import { withGlobalState } from "react-globally";
import useNFTValidatorMessage from "../../hooks/useNFTValidatorMessage";
import useNFTValidatorValidate from "../../hooks/useNFTValidatorValidate";

const NFTValidator: React.FC<any> = props => {
    const message = useNFTValidatorMessage();
    const { onValidate } = useNFTValidatorValidate(props);

    const [tokenID, setTokenID] = useState<number>();
    const handleTokenIDChange = useCallback(
        event => {
            setTokenID(event.target.value);
        },
        [setTokenID],
    );

    const [decryptedSecret, setDecryptedSecret] = useState<string>();
    const handleDecryptedSecret = useCallback(
        event => {
            setDecryptedSecret(event.target.value);
        },
        [setDecryptedSecret],
    );

    const [proof, setProof] = useState<string>();
    const handleMerkleProofChange = useCallback(
        event => {
            setProof(event.target.value);
        },
        [setProof],
    );

    const handleValidate = useCallback(() => {
        onValidate(tokenID, decryptedSecret, proof);
    }, [onValidate, tokenID, decryptedSecret, proof]);

    return (
        <div className="main">
            <div className="container">
                <h1>NFT Validator</h1>
                <br />
                <div className="row">
                    <div className="col-sm-12">Current decoded message: {message}</div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <div className="form-group">
                            <label htmlFor="tokenID">Token ID</label>
                            <input type="number" className="form-control" id="tokenID" onChange={handleTokenIDChange} />
                            <br />
                            <label htmlFor="decryptedSecret">Decrypted Secret</label>
                            <input
                                type="string"
                                className="form-control"
                                id="decryptedSecret"
                                onChange={handleDecryptedSecret}
                            />
                            <br />
                            <label htmlFor="Merkle Proof">Merkle Proof</label>
                            <input
                                type="string"
                                className="form-control"
                                id="merkleProof"
                                onChange={handleMerkleProofChange}
                            />
                        </div>
                        <button type="button" className="btn btn-primary" onClick={handleValidate}>
                            Validate
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default withGlobalState(NFTValidator);

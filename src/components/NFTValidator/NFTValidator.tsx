import { useCallback, useState } from "react";

import { withGlobalState } from "react-globally";
import useNFTValidatorMessage from "../../hooks/useNFTValidatorMessage";
import useNFTValidatorValidate from "../../hooks/useNFTValidatorValidate";
import useNFTValidatorValidateList from "../../hooks/useNFTValidatorValidateList";

const NFTValidator: React.FC<any> = props => {
    const message = useNFTValidatorMessage();

    // Decoded message
    const [showMessage, setShowMessage] = useState<boolean>(false);
    const handleShowMessage = useCallback(() => setShowMessage(!showMessage), [setShowMessage, showMessage]);

    // Single validation
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

    // Batch validation
    const { onValidateList } = useNFTValidatorValidateList(props);

    const [tokenIDList, setTokenIDList] = useState<string>();
    const handleTokenIDListChange = useCallback(
        event => {
            setTokenIDList(event.target.value);
        },
        [setTokenIDList],
    );

    const [decryptedSecretList, setDecryptedSecretList] = useState<string>();
    const handleDecryptedSecretList = useCallback(
        event => {
            setDecryptedSecretList(event.target.value);
        },
        [setDecryptedSecretList],
    );

    const [proofList, setProofList] = useState<string>();
    const handleMerkleProofListChange = useCallback(
        event => {
            setProofList(event.target.value);
        },
        [setProofList],
    );

    const handleValidateList = useCallback(() => {
        onValidateList(tokenIDList, decryptedSecretList, proofList);
    }, [onValidateList, tokenIDList, decryptedSecretList, proofList]);

    return (
        <div className="main">
            <div className="container">
                <h1>NFT Validator</h1>
                <div className="row">
                    <div className="col-sm-12">
                        <button type="button" className="btn btn-primary" onClick={handleShowMessage}>
                            {showMessage ? "Hide Message" : "Show Message"}
                        </button>
                        <br />
                        Current decoded message:
                        {showMessage && <pre style={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}>{message}</pre>}
                    </div>
                </div>
                <br />
                <div className="row">
                    <div className="col-sm-12">
                        <h2>Single Validation</h2>
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
                            <label htmlFor="merkleProof">Merkle Proof</label>
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
                <div className="row">
                    <div className="col-sm-12">
                        <h2>Batch Validation</h2>
                        <div className="form-group">
                            <label htmlFor="tokenIDs">Token IDs</label>
                            <input
                                type="string"
                                className="form-control"
                                id="tokenIDs"
                                onChange={handleTokenIDListChange}
                            />
                            <br />
                            <label htmlFor="decryptedSecrets">Decrypted Secrets</label>
                            <input
                                type="string"
                                className="form-control"
                                id="decryptedSecrets"
                                onChange={handleDecryptedSecretList}
                            />
                            <br />
                            <label htmlFor="merkleProofs">Merkle Proofs</label>
                            <input
                                type="string"
                                className="form-control"
                                id="merkleProofs"
                                onChange={handleMerkleProofListChange}
                            />
                        </div>
                        <button type="button" className="btn btn-primary" onClick={handleValidateList}>
                            Batch Validate
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default withGlobalState(NFTValidator);

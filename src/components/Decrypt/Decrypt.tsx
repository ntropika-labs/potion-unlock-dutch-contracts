import { useCallback, useState } from "react";

import { withGlobalState } from "react-globally";
import useMetamaskDecrypt from "../../hooks/useMetamaskDecrypt";

const Decrypt: React.FC<any> = props => {
    const { decryptedMessage, onDecrypt } = useMetamaskDecrypt(props);

    const [encrypted, setEncrypted] = useState("");
    const handleEncryptedChange = useCallback(
        event => {
            setEncrypted(event.target.value);
        },
        [setEncrypted],
    );

    const handleDecrypt = useCallback(() => {
        onDecrypt(encrypted);
    }, [onDecrypt, encrypted]);

    return (
        <div className="main">
            <div className="container">
                <h1>Decrypt with Metamask</h1>
                <div className="row">
                    <div className="col-sm-12">
                        <div className="form-group">
                            <label htmlFor="encrypt">Message</label>
                            <input
                                type="string"
                                className="form-control"
                                id="encrypt"
                                onChange={handleEncryptedChange}
                            />
                        </div>
                        <button type="button" className="btn btn-primary" onClick={handleDecrypt}>
                            Decrypt
                        </button>
                        <br />
                        Decrypted message:{" "}
                        <pre style={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}>{decryptedMessage}</pre>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default withGlobalState(Decrypt);

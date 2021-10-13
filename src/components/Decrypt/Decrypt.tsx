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

    const myText = {
        width: "200px",
        "wrap-word": "break-word",
    };
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
                        <div style={myText}>Decrypted message: {decryptedMessage}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default withGlobalState(Decrypt);

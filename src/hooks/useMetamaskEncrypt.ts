import { useCallback, useState } from "react";
import { bufferToHex } from "ethereumjs-util";
import { encrypt } from "@metamask/eth-sig-util";

const useMetamaskEncrypt = (props: any) => {
    const [encryptedMessage, setEncryptedMessage] = useState<string>();
    const handleEncrypt = useCallback(async (plaintext: string, key: string) => {
        const encryptedData = encrypt({ publicKey: key, data: plaintext, version: "x25519-xsalsa20-poly1305" });
        const encryptedString = JSON.stringify(encryptedData);
        const encryptedBuffer = Buffer.from(encryptedString, "utf8");
        const encrypted = bufferToHex(encryptedBuffer);

        setEncryptedMessage(encrypted);
    }, []);

    return { encryptedMessage, onEncrypt: handleEncrypt };
};

export default useMetamaskEncrypt;

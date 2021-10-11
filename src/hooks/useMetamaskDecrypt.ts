import { useCallback, useState } from "react";
import { useWallet } from "@binance-chain/bsc-use-wallet";

declare const window: any;

const useMetamaskDecrypt = (props: any) => {
    const { account } = useWallet();

    const [decryptedMessage, setDecryptedMessage] = useState<string>();
    const handleDecrypt = useCallback(
        async (encrypted: string) => {
            if (account) {
                const decrypted: string = await window.ethereum.request({
                    method: "eth_decrypt",
                    params: [encrypted, account], // you must have access to the specified account
                });

                setDecryptedMessage(decrypted);
            }
        },
        [account]
    );

    return { decryptedMessage, onDecrypt: handleDecrypt };
};

export default useMetamaskDecrypt;

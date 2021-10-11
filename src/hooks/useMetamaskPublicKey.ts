import { useWallet } from "@binance-chain/bsc-use-wallet";
import { useCallback, useState } from "react";

declare const window: any;

const useMetamaskEncrypt = (props: any) => {
    const { account } = useWallet();

    const [publicKey, setPublicKey] = useState<string>();
    const handleGetPublicKey = useCallback(async () => {
        if (account) {
            const key: string = await window.ethereum.request({
                method: "eth_getEncryptionPublicKey",
                params: [account], // you must have access to the specified account
            });

            setPublicKey(key);
        }
    }, [account]);

    return { publicKey, onGetPublicKey: handleGetPublicKey };
};

export default useMetamaskEncrypt;

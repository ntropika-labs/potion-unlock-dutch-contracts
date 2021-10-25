import { useCallback } from "react";
import useNFTContract from "./useNFTContract";
import useHandleTransaction from "./useHandleTransaction";
import useMetamaskPublicKey from "./useMetamaskPublicKey";

const useNFTMinting = (props: any) => {
    const handleTransaction = useHandleTransaction(props);
    const nft = useNFTContract();
    const { publicKey, onGetPublicKey } = useMetamaskPublicKey(props);

    const handleMinting = useCallback(async () => {
        const publicKey = await onGetPublicKey();
        handleTransaction(nft.mint(publicKey));
    }, [nft, handleTransaction, onGetPublicKey]);
    return { onMinting: handleMinting };
};

export default useNFTMinting;

import { useCallback } from "react";
import useSVGNFTContract from "./useSVGNFT";
import useHandleTransaction from "./useHandleTransaction";
import useMetamaskPublicKey from "./useMetamaskPublicKey";

const useSVGNFTMinting = (props: any) => {
    const handleTransaction = useHandleTransaction(props);
    const svgnft = useSVGNFTContract();
    const { publicKey, onGetPublicKey } = useMetamaskPublicKey(props);

    const handleMinting = useCallback(async () => {
        const publicKey = await onGetPublicKey();
        handleTransaction(svgnft.mint(publicKey));
    }, [svgnft, handleTransaction, onGetPublicKey]);
    return { onMinting: handleMinting };
};

export default useSVGNFTMinting;

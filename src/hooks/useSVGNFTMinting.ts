import { useCallback } from "react";
import useSVGNFTContract from "./useSVGNFT";
import useHandleTransaction from "./useHandleTransaction";

const useSVGNFTMinting = (props: any) => {
    const handleTransaction = useHandleTransaction(props);
    const svgnft = useSVGNFTContract();

    const handleMinting = useCallback(
        async (publicKey: string) => {
            handleTransaction(svgnft.mint(publicKey));
        },
        [svgnft, handleTransaction],
    );
    return { onMinting: handleMinting };
};

export default useSVGNFTMinting;

import { useCallback } from "react";
import useNFTContract from "./useNFTContract";
import useHandleTransaction from "./useHandleTransaction";
import useMetamaskPublicKey from "./useMetamaskPublicKey";
import { BigNumber } from "ethers";

const useNFTMinting = (props: any) => {
    const handleTransaction = useHandleTransaction(props);
    const nft = useNFTContract();
    const { onGetPublicKey } = useMetamaskPublicKey(props);

    const handleMinting = useCallback(
        async tokenId => {
            const publicKey = await onGetPublicKey();
            handleTransaction(nft.mint(BigNumber.from(tokenId), publicKey));
        },
        [nft, handleTransaction, onGetPublicKey],
    );
    return { onMinting: handleMinting };
};

export default useNFTMinting;

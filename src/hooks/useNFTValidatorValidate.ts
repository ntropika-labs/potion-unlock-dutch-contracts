import { useCallback } from "react";
import useNFTValidatorContract from "./useNFTValidator";
import useHandleTransaction from "./useHandleTransaction";

const useNFTValidatorValidate = (props: any) => {
    const handleTransaction = useHandleTransaction(props);
    const nftValidator = useNFTValidatorContract();

    const handleValidate = useCallback(
        async (tokenId: number, decryptedSecret: string, proof: any) => {
            handleTransaction(nftValidator.validate(tokenId, decryptedSecret, proof));
        },
        [nftValidator, handleTransaction],
    );
    return { onValidate: handleValidate };
};

export default useNFTValidatorValidate;

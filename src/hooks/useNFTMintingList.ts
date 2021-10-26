import { useCallback } from "react";
import useNFTContract from "./useNFTContract";
import useHandleTransaction from "./useHandleTransaction";
import useMetamaskPublicKey from "./useMetamaskPublicKey";
import { BigNumber } from "@ethersproject/bignumber";

function range(start: number, end: number): number[] {
    return Array.from(new Array(end - start + 1).keys()).map(item => start + item);
}

interface Range {
    firstId: BigNumber;
    lastId: BigNumber;
}

const useNFTMintingList = (props: any) => {
    const handleTransaction = useHandleTransaction(props);
    const nft = useNFTContract();
    const { onGetPublicKey } = useMetamaskPublicKey(props);

    const handleMintingList = useCallback(
        async (tokenIds: Range[]) => {
            const tokenIdsListNumber = tokenIds
                .map(item => range(item.firstId.toNumber(), item.lastId.toNumber()))
                .flat(1);
            const tokenIdsList = tokenIdsListNumber.map(item => BigNumber.from(item));

            const publicKey = await onGetPublicKey();
            handleTransaction(nft.mintList(tokenIdsList, publicKey));
        },
        [nft, handleTransaction, onGetPublicKey],
    );
    return { onMintingList: handleMintingList };
};

export default useNFTMintingList;

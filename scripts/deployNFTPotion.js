require("dotenv").config();

const { deployPotionNFTGame } = require("./deployUtils");
const hre = require("hardhat")

async function main() {
   const isTest = hre.network.name === "localhost" ?  true : false
   if (isTest) {
    await deployPotionNFTGame(undefined, isTest);
   } else {
       await deployPotionNFTGame();
   }
   
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

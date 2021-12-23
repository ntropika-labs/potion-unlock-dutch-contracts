require("dotenv").config();

const { deployPotionNFTGame } = require("./deployUtils");

async function main() {
    await deployPotionNFTGame();
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

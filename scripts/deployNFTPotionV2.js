require("dotenv").config();

const { deployPotionNFTV2Game } = require("./deployUtils");

async function main() {
    await deployPotionNFTV2Game(true, true);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

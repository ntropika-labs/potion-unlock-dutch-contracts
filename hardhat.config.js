require("@nomiclabs/hardhat-waffle");
require("hardhat-abi-exporter");
require("hardhat-gas-reporter");

require("dotenv").config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
        console.log(account.address);
    }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    solidity: "0.8.9",
    paths: {
        artifacts: "./src/artifacts",
    },
    networks: {
        hardhat: {
            chainId: 1337,
            gasPrice: 180000000000,
        },
        localhost: {
            url: "http://127.0.0.1:8545",
            gasPrice: 180000000000,
        },
    },
    abiExporter: {
        path: "./abis",
        clear: true,
        flat: true,
        only: [":NFT", ":INFTPotionValidator$"],
        spacing: 2,
        pretty: false,
    },
    gasReporter: {
        currency: "EUR",
        coinmarketcap: process.env.COINMARKETCAP_API_KEY,
        enabled: true,
    },
};

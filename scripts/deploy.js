const hre = require("hardhat");

async function main() {
    const SimpleContract = await hre.ethers.getContractFactory("SimpleContract");
    const simpleContract = await SimpleContract.deploy();

    console.log("SimpleContract deployed to:", simpleContract.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

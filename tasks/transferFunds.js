const { color } = require("console-log-colors");
const { red, green } = color;
const { ErrorAndExit, confirmAction } = require("../scripts/lib/ui_utils");

const { task, types } = require("hardhat/config");

require("dotenv").config();

async function getContract(args, ethers) {
    const NFTPotionFunds = await ethers.getContractFactory("NFTPotionERC20Funds");
    return NFTPotionFunds.attach(args.contract);
}

function addTask() {
    task("transferFunds", "Transfer the funds of the sale to the indicated account")
        .addParam("contract", "Address of the contract to connect to", undefined, types.string, false)
        .addParam("receiver", "Address of the receiver of the funds", undefined, types.string, false)
        .addParam("amount", "Amount to transfer", undefined, types.int, false)
        .setAction(async (args, hre) => {
            const ethers = hre.ethers;

            const Funds = await getContract(args, ethers);

            console.log(red(`\n--------------------------------------------------------`));
            console.log(red(`Funds will be transferred to the following account:`));
            console.log(red(`${args.receiver}`));
            console.log(red(`--------------------------------------------------------`));

            if (!(await confirmAction("Do you want to continue? (y/N) "))) {
                ErrorAndExit("Aborting task execution...");
            }

            const tx = await Funds.transferFunds(args.receiver, args.amount);
            await tx.wait();

            console.log(green(`\n[SUCCESS]`));
        });
}

module.exports = addTask;

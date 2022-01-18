const readline = require("readline");
const util = require("util");
const { color } = require("console-log-colors");
const { red, bold } = color;

async function confirmAction(message) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    // Prepare readline.question for promisification
    rl.question[util.promisify.custom] = question => {
        return new Promise(resolve => {
            rl.question(question, resolve);
        });
    };

    const question = util.promisify(rl.question);
    const answer = await question(bold(message));

    if (answer === "y" || answer === "yes" || answer === "Y" || answer === "YES") {
        return true;
    } else {
        return false;
    }
}

function ErrorAndExit(message) {
    console.log(red(message));
    process.exit(1);
}


module.exports = {
    ErrorAndExit,
    confirmAction,
}
const { expect, assert } = require("chai");
const seedrandom = require("seedrandom");

function initRandom(seed = undefined) {
    if (seed === undefined) {
        seed = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    }
    const getRandomFloat = seedrandom(seed);
    const getRandom = () => Math.floor(getRandomFloat() * Number.MAX_SAFE_INTEGER);

    return { seed, getRandom };
}

function shuffle(array, getRandom) {
    return array.sort((a, b) => getRandom() / Number.MAX_SAFE_INTEGER - 0.5);
}

function range(start, end) {
    return Array.from(new Array(end - start + 1).keys()).map(item => start + item);
}

async function expectThrow(async_fn, error_msg) {
    try {
        await async_fn();
    } catch (error) {
        expect(error.message).to.equal(error_msg);
        return;
    }

    assert.fail("Should have thrown error: " + error_msg);
}

module.exports = { range, expectThrow, initRandom, shuffle };

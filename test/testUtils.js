const { expect, assert } = require("chai");

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

module.exports = { range, expectThrow };

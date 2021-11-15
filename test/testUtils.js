function range(start, end) {
    return Array.from(new Array(end - start + 1).keys()).map(item => start + item);
}

module.exports = { range };

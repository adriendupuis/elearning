Array.prototype.shuffle = function () {
    let result = this.slice(0);
    for (let current = this.length - 1; current > 0; current--) {
        let random = Math.floor(Math.random() * (current + 1));
        [result[current], result[random]] = [result[random], result[current]];
    }
    return result;
}

goog.module('tsickle_test.optional.optional');/**
 * @param {number} x
 * @param {string=} y
 * @return {void}
 */
function optionalArgument(x, y) {
}
optionalArgument(1);
class OptionalTest {
    /**
     * @param {string} a
     * @param {string=} b
     */
    constructor(a, b) {
    }
    /**
     * @param {string=} c
     * @return {void}
     */
    method(c = 'hi') { }
}
let /** @type {OptionalTest} */ optionalTest = new OptionalTest('a');
optionalTest.method();

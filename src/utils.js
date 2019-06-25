"use strict";
exports.__esModule = true;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
var ast_types_1 = require("ast-types");
var immutable_1 = require("immutable");
function copyTree(node) {
    var out = immutable_1.Map();
    ast_types_1.eachField(node, function (name, value) {
        if (Array.isArray(value)) {
            if (typeof value[0] === 'string') { //instanceof namedTypes.Node) {
                throw new Error('');
            }
        }
        else if (value
            && value.constructor && value.constructor.name === "Node") {
            out = out.set(name, copyTree(value));
        }
        else if (value && value.type) {
            throw new Error(value.type);
        }
        else {
            {
                out = out.set(name, value);
            }
        }
    });
    return out;
}
exports.copyTree = copyTree;

"use strict";
exports.__esModule = true;
var src_1 = require("classModel/lib/src");
var immutable_1 = require("immutable");
var InMemoryRegistry = /** @class */ (function () {
    function InMemoryRegistry() {
        this.modules = immutable_1.Map();
    }
    InMemoryRegistry.prototype.getModuleKey = function (name) {
        return name;
    };
    InMemoryRegistry.prototype.getModule = function (moduleKey, moduleName, create) {
        if (this.modules.has(moduleKey)) {
            var r = this.modules.get(moduleKey);
            if (r) {
                return r;
            }
        }
        if (create) {
            var r = new src_1.Module(moduleKey, moduleName);
            this.modules = this.modules.set(moduleKey, r);
            return r;
        }
        throw new Error("No such module " + moduleKey);
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    InMemoryRegistry.prototype.getModuleByName = function (name) {
        return undefined;
    };
    InMemoryRegistry.prototype.init = function () {
    };
    InMemoryRegistry.prototype.save = function () {
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    InMemoryRegistry.prototype.setModule = function (key, module) {
    };
    return InMemoryRegistry;
}());
exports.InMemoryRegistry = InMemoryRegistry;

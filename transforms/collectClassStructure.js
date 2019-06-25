"use strict";
exports.__esModule = true;
var transformUtils_1 = require("../src/transformUtils");
var ast_types_1 = require("ast-types");
var path = require("path");
var Factory_1 = require("../src/Factory");
// eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-explicit-any
function handleImportSpecifier(argument, importContext, importModuleName, localName, exportedName, isDefault, isNamespace) {
    var module = argument;
    if (localName === undefined) {
        throw new Error('');
    }
    module.addImport(importModuleName, localName, exportedName, isDefault, isNamespace);
}
function getModuleName(fileInfo) {
    var _f = path.resolve(fileInfo.path);
    //    const relativeBase = path.dirname(_f);
    var moduleName = _f.replace(/\.ts$/, '');
    return moduleName;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function recordRun(fileInfo, api, options) {
    //    console.log(fileInfo.path);
}
function getRegistry() {
    var registry = undefined;
    try {
        registry = Factory_1.createRegistry();
    }
    catch (error) {
        throw error;
    }
    if (registry === undefined) {
        throw new Error('registry undefined');
    }
    return registry;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
module.exports = function (fileInfo, api, options) {
    recordRun(fileInfo, api, options);
    var registry = getRegistry();
    var j = api.jscodeshift;
    /* parse source */
    var collection = j(fileInfo.source);
    /* fiddle with path to get module name */
    var moduleName = getModuleName(fileInfo);
    // our biz obj
    var moduleKey = registry.getModuleKey(moduleName);
    var module = registry.getModule(moduleKey, moduleName, true);
    if (module === undefined) {
        throw new Error('no module');
    }
    var context = {
        module: transformUtils_1.getModuleSpecifier(fileInfo.path)
    };
    transformUtils_1.handleImportDeclarations1(collection, moduleName, context, function (importContext, importName, localName, exportedName, isDefault, isNamespace) {
        return handleImportSpecifier(module, importContext, importName, localName, exportedName, isDefault, isNamespace);
    });
    var newBody = collection.paths()[0].value.program.body.slice();
    var newFile = j.file(j.program(newBody));
    var newExports = [];
    transformUtils_1.processClassDeclarations(collection, registry, module);
    transformUtils_1.processExportNamedDeclarations(collection, module);
    transformUtils_1.processExportDefaultDeclaration(ast_types_1.builders, collection, newExports, module);
    try {
        registry.save();
    }
    catch (error) {
        //        console.log(error.message);
    }
    return j(newFile).toSource();
};

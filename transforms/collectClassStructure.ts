import {Module} from "../src/Module";
import {
    handleImportDeclarations,
    processClassDeclarations,
    processExportDefaultDeclaration,
    processExportNamedDeclarations
} from "../src/transformUtils";
import { SimpleRegistry } from '../src/Registry';
const { builders, parse, print  } = require('recast');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

/**
 * Violate the rule pf doing more than one thing well by simultaneously
 * transforming the structure of exports in the source code AND accumulate
 * helpful data for later processing.
 * @param fileInfo
 * @param api
 * @param options
 */
module.exports = function (fileInfo, api, options) {
    const report = api.report;
    const runId = process.pid;
    const registry = new SimpleRegistry({ runId });
    registry.init();

    const j = api.jscodeshift;
    const collection = j(fileInfo.source);

    const _f = path.resolve(fileInfo.path);
    const relativeBase = path.dirname(_f);
    const moduleName = _f.replace(/\.ts$/, '');

    // our biz obj
    const module = registry.getModule(moduleName, true);

    let maxImport = -1;
    handleImportDeclarations(api, collection, maxImport, relativeBase, module);
    const newBody = [...collection.paths()[0].value.program.body];

    const newFile = j.file(j.program(newBody));
    const newExports = [];

    processClassDeclarations(api, collection, module);
    const { allSpecs } = processExportNamedDeclarations(api, collection, module);
    if(allSpecs.length > 1) {
        report(allSpecs.length);
    }
    processExportDefaultDeclaration(api, api, collection, newBody, newExports, module);

    //store.module[moduleName] = module.toPojo();

    //newBody.push(...newExports);
    //fs.writeFileSync('sources_1.json', JSON.stringify(store, null, 4), 'utf-8');
    registry.save();
    return j(newFile).toSource();
};


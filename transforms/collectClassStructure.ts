import {Module} from "classModel/lib/Module";
import {
    handleImportDeclarations,
    processClassDeclarations,
    processExportDefaultDeclaration,
    processExportNamedDeclarations
} from "../src/transformUtils";
import {namedTypes} from "ast-types/gen/namedTypes";
import { parse, print } from 'recast';
import { builders} from 'ast-types';
import * as path from 'path';
import * as fs from 'fs';
import * as assert from 'assert';
import {SimpleRegistry} from "classModel/lib/SimpleRegistry";
/**
 * Violate the rule pf doing more than one thing well by simultaneously
 * transforming the structure of exports in the source code AND accumulate
 * helpful data for later processing.
 * @param fileInfo
 * @param api
 * @param options
 */
// @ts-ignore
module.exports = function (fileInfo, api, options) {
    const report = api.report;
    const runId = process.pid;
    const registry = new SimpleRegistry({ runId });
    registry.init();

    const j = api.jscodeshift;
    const collection = j(fileInfo.source);

    //console.log(fileInfo.path);
    const _f = path.resolve(fileInfo.path);
    const relativeBase = path.dirname(_f);
    const moduleName = _f.replace(/\.ts$/, '');

    // our biz obj
    const moduleKey = registry.getModuleKey(moduleName);
    const module = registry.getModule(moduleKey, moduleName, true);

    let maxImport = -1;
    handleImportDeclarations(collection, maxImport, relativeBase, module);

    //module.setImported(imported);
    const newBody = [...collection.paths()[0].value.program.body];

    const newFile = j.file(j.program(newBody));
    const newExports: namedTypes.Node[] = [];

    processClassDeclarations(collection, registry, module);
    processExportNamedDeclarations(collection, module);
    processExportDefaultDeclaration(builders,
        collection, newExports, module);
    try {
        registry.save();
    } catch(error) {
        console.log(error.message);
        throw error;
    }
    return j(newFile).toSource();
};


import {
    handleImportDeclarations, handleImportDeclarations1,
    processClassDeclarations,
    processExportDefaultDeclaration,
    processExportNamedDeclarations,
    getModuleSpecifier,
} from "../src/transformUtils";
import {namedTypes} from "ast-types/gen/namedTypes";
import { builders} from 'ast-types';
import * as path from 'path';
import * as fs from 'fs';
import {SimpleRegistry} from "classModel";
import { ImportContext } from './types';
import {API, FileInfo,Options} from "jscodeshift/src/core";
/**
 * Violate the rule pf doing more than one thing well by simultaneously
 * transforming the structure of exports in the source code AND accumulate
 * helpful data for later processing.
 * @param fileInfo
 * @param api
 * @param options
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
module.exports = function (fileInfo: FileInfo, api: API, options: Options): string {
    const runId = process.pid;
    const persistence = {};
    const registry = new SimpleRegistry({ runId,
        persistence,
        getJsonString: (): string => fs.readFileSync('registry.json', { encoding: 'utf-8' }),
    });
    registry.init();

    const j = api.jscodeshift;
    /* parse source */
    const collection = j(fileInfo.source);

    /* fiddle with path to get module name */
    const _f = path.resolve(fileInfo.path);
    const relativeBase = path.dirname(_f);
    const moduleName = _f.replace(/\.ts$/, '');

    // our biz obj
    const moduleKey = registry.getModuleKey(moduleName);
    const module = registry.getModule(moduleKey, moduleName, true);

    let maxImport = -1;
    const context: ImportContext = {
        module: getModuleSpecifier(fileInfo.path),
    };
    handleImportDeclarations(collection, maxImport, relativeBase, module);
    console.log(`context is ${context});
    handleImportDeclarations1(collection, relativeBase, context,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    					  (importContext: ImportContext, localName: string, importName: string, isDefault?: boolean, isNamespace?: boolean): void => {
            console.log(`localname is ${localName}, ${importContext}`);
        });

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
//        console.log(error.message);
    }
    return j(newFile).toSource();
};


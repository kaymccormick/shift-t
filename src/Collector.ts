import core from "jscodeshift";
import {createRegistry} from "./TypeOrm/Factory";
import {ImportContext} from "./types";
import {
    getModuleSpecifier,
    handleImportDeclarations1,
    processClassDeclarations,
    processExportDefaultDeclaration,
    processExportNamedDeclarations
} from "./transformUtils";
import {Module} from "../../classModel/lib/src";
import {namedTypes} from "ast-types/gen/namedTypes";
import {builders} from "ast-types";
import * as path from "path";
import j from 'jscodeshift';

function getModuleName(path1: string): string {
    const _f = path.resolve(path1);
    //    const relativeBase = path.dirname(_f);
    const moduleName = _f.replace(/\.ts$/, '');
    return moduleName;
}

export function processSourceModule(path1: string, file: namedTypes.File): Promise<void> {
    console.log(path1);
    return createRegistry().then(registry => {
        if (registry === undefined) {
            throw new Error('');
        }

        const moduleName = getModuleName(path1);
        return registry.getModule('', moduleName, true).then(module => {
            const context: ImportContext = {
                module: getModuleSpecifier(path1),
            };
            // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-explicit-any
            const handleImportSpecifier =
                (argument: any,
                 importContext: ImportContext,
                 importModuleName: string,
                 localName?: string,
                 exportedName?: string,
                 isDefault?: boolean,
                 isNamespace?: boolean): void => {
                    const module = argument as Module;
                    if (localName === undefined) {
                        throw new Error('');
                    }
                    module.addImport(importModuleName, localName, exportedName, isDefault, isNamespace);
                };

            const collection = j(file);
            handleImportDeclarations1(
                collection,
                moduleName,
                context,
                (importContext: ImportContext,
                 importName: string,
                 localName: string,
                 exportedName?: string,
                 isDefault?: boolean,
                 isNamespace?: boolean): void => {
                    return handleImportSpecifier(
                        module,
                        importContext,
                        importName,
                        localName,
                        exportedName,
                        isDefault,
                        isNamespace);
                });

            const newExports: namedTypes.Node[] = [];

            processClassDeclarations(collection, registry, module);
            processExportNamedDeclarations(collection, module);
            processExportDefaultDeclaration(builders,
                collection, newExports, module);
        });
    }).catch(error => {
        console.log(error);
    });
}

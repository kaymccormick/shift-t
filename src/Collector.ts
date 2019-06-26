import core from "jscodeshift";
import {createRegistry,createConnection} from "./TypeOrm/Factory";
import {ImportContext} from "./types";
import {
    getModuleSpecifier,
    handleImportDeclarations1,
    processClassDeclarations,
    processExportDefaultDeclaration,
    processExportNamedDeclarations
} from "./transformUtils";
import {Module} from "../../classModel/lib/src";
import {EntityCore} from "classModel";
import {File,Node} from "ast-types/gen/nodes";
import {builders} from "ast-types";
import * as path from "path";
import j from 'jscodeshift';
import { Connection } from "typeorm";

function getModuleName(path1: string): string {
    const _f = path.resolve(path1);
    //    const relativeBase = path.dirname(_f);
    const moduleName = _f.replace(/\.ts$/, '');
    return moduleName;
}

export function processSourceModule(connection: Connection, project: EntityCore.Project, path1: string, file: File): Promise<void> {
    console.log(path1);
    const moduleName = getModuleName(path1);
    const moduleRepo = connection.getRepository(EntityCore.Module);

    const getOrCreateModule = (name: string): Promise<EntityCore.Module> => {
        if(name === undefined) {
            throw new Error('name undefined');
        }
        return moduleRepo.find({project, name}).then(modules => {
            if(!modules.length) {
                return moduleRepo.save(new EntityCore.Module(name, project, [], [], []));
            } else {
                return modules[0];
            }
        });
    };

    const handleModule = (module: EntityCore.Module): Promise<void> => {
        const moduleName = module.name;
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
                    isNamespace?: boolean): Promise<void> => {
                    const importRepo = connection.getRepository(EntityCore.Module);
                    const module = argument as EntityCore.Module;
		    console.log(`creating ${localName}`);
                    if (localName === undefined) {
                        throw new Error('');
                    }
		    
		    const import_ = new EntityCore.Import(module, localName, importModuleName, exportedName, isDefault, isNamespace);
		    return importRepo.save(import_).then(() => undefined).catch(error => {
		    console.log(error);
		    });
                };

        // @ts-ignore
        const collection = j(file);
        return handleImportDeclarations1(
            collection,
            moduleName,
            context,
            (importContext: ImportContext,
                importName: string,
                localName: string,
                exportedName?: string,
                isDefault?: boolean,
                isNamespace?: boolean): Promise<void> => {
                console.log('here');
                return handleImportSpecifier(
                    module,
                    importContext,
                    importName,
                    localName,
                    exportedName,
                    isDefault,
                    isNamespace);
            });

        /*
        const newExports: Node[] = [];
            processClassDeclarations(collection, registry, module);
            processExportNamedDeclarations(collection, module);
            processExportDefaultDeclaration(builders,
                collection, newExports, module);
*/
    };
    return getOrCreateModule(moduleName).then(handleModule).catch(error => {
        console.log(error);
    });
}

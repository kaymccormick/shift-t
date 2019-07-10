import {Promise} from 'bluebird';
import {ImportContext,ModuleSpecifier,Args} from "./types";
import {TransformUtils} from "./transformUtils";
import EntityCore from"classModel/lib/src/entityCore";
import path from "path";
import j from 'jscodeshift';
import { Connection } from "typeorm";
import {namedTypes} from "ast-types/gen/namedTypes";
import File = namedTypes.File;

export function getModuleSpecifier(path: string): ModuleSpecifier  {
    return path;
}
function getModuleName(path1: string): string {
    const _f = path.resolve(path1);
    // const relativeBase = path.dirname(_f);
    const moduleName = _f.replace(/\.ts$/, '');
    return moduleName;
}

export function processSourceModule(args: Args, project: EntityCore.Project, path1: string, file: File): Promise<void> {
    const moduleName = getModuleName(path1);
    const moduleRepo = args.connection.getRepository(EntityCore.Module);

    const getOrCreateModule = (name: string): Promise<EntityCore.Module> => {
        if(!name) {
            throw new Error('name undefined');
        }
        return moduleRepo.find({project, name}).then((modules): Promise<EntityCore.Module> => {
            if(!modules.length) {
                //                console.log(`saving new module with ${name}`);
                return moduleRepo.save(new EntityCore.Module(name, project, [], [], [], [], []))/*.catch((error: Error): void => {
                    console.log(error.message);
                    console.log('unable to create module');
                })*/;
            } else {
                return Promise.resolve(modules[0]);
            }
        });
    };

    const handleModule = (
        module: EntityCore.Module
    ): Promise<void>    => {
    args.logger.info('handleModule');
        const moduleName = module.name;
        const context: ImportContext = {
            module: getModuleSpecifier(path1),
            moduleEntity: module,
        };
        const handleImportSpecifier =
        // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-explicit-any
                (argument: any,
                    importContext: ImportContext,
                    importModuleName: string,
                    localName?: string,
                    exportedName?: string,
                    isDefault?: boolean,
                    isNamespace?: boolean): Promise<void> => {
                    const importRepo = args.connection.getRepository(EntityCore.Import);
                    const nameRepo = args.connection.getRepository(EntityCore.Name);
                    const module = argument as EntityCore.Module;
                    if (localName === undefined) {
                        throw new Error('no localName');
                    }
                    return nameRepo.find({where: {name: localName, module: importContext.moduleEntity}}).then(names => {
                        if (names.length === 0) {
                            const name = new EntityCore.Name();
                            name.module = importContext.moduleEntity;
                            name.name = localName;
                            name.nameKind = 'import';
                            return nameRepo.save(name).then(() => undefined);
                        } else {
                        // update the thing here
                            //console.log(names);
                        }
                    }).then(() =>
                        importRepo.find({module, localName}).then(imports => {
                            if (imports.length === 0) {
                                const import_ = new EntityCore.Import(module, localName, importModuleName, exportedName, isDefault, isNamespace);
                                return importRepo.save(import_).then((): undefined => undefined).catch((error: Error): void => {
                                    console.log(`unable to create Import: ${error.message}`);
                                });
                            } else {
                                //
                            }
                        }));
                }

        // @ts-ignore
        const collection = j(file);
        // const t = TransformUtils;
        // Object.keys(t).forEach(key => {
        // console.log(`key is ${key}`);
        // });
        return [
          () => TransformUtils.handleImportDeclarations(
            args,
            collection.nodes()[0],
            moduleName!,
            context,
            (importContext: ImportContext,
                importName: string,
                localName: string,
                exportedName?: string,
                isDefault?: boolean,
                isNamespace?: boolean): Promise<void> => {
                return handleImportSpecifier(
                    module,
                    importContext,
                    importName,
                    localName,
                    exportedName,
                    isDefault,
                    isNamespace);
            }),

        () => TransformUtils.processClassDeclarations(args, module, collection.nodes()[0]),
        () => TransformUtils.processInterfaceDeclarations(args, module, collection.nodes()[0]),
        () => TransformUtils.processExportDefaultDeclaration(args, module, collection.nodes()[0]),
        () => TransformUtils.processExportNamedDeclarations(args, module, collection.nodes()[0]),
        () => TransformUtils.processNames(args,module, collection.nodes()[0]),
      () => TransformUtils.processTypeDeclarations(args, module, collection.nodes()[0]),        
    // @ts-ignore
    ].reduce((a, v: () => Promise<any>) => a.then(r => {
            const z = v();
            return z.then(cr => [...r, cr]).catch((error: Error) => {
        args.logger.error('errorz', {error});
        });;
        }), Promise.resolve([])).then((results: any[]) => {
        args.logger.debug('results', {results});
        }).catch((error: Error): void => {
        args.logger.error('error1', { error});
        });
    };
    return getOrCreateModule(moduleName).then(handleModule).catch((error: Error): void => {
    args.logger.error('error2', { error});
    });
}

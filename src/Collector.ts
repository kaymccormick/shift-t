import AppError from './AppError';
import {Promise} from 'bluebird';
import {ImportContext,ModuleSpecifier,PromiseResult,HandleModulePromiseResult} from "./types";
import {TransformUtils} from "./transformUtils";
import {ProcessClasses} from "./process/classes/ProcessClasses";
import {ProcessInterfaces} from "./process/interfaces/ProcessInterfaces";
import {ProcessTypes} from "./process/types/ProcessTypes";
import EntityCore from"classModel/lib/src/entityCore";
import path from "path";
import j from 'jscodeshift';
import {namedTypes} from "ast-types/gen/namedTypes";
import File = namedTypes.File;
import { TransformUtilsArgs } from '../src/transformUtils';

export function getModuleSpecifier(path: string): ModuleSpecifier  {
    return path;
}
function getModuleName(path1: string, project: EntityCore.Project): string {
    let _f = path.resolve(path1);
    // const relativeBase = path.dirname(_f);
    _f = path.relative(project.path!, _f);
    const moduleName = _f.replace(/\.tsx?$/, '');

    return moduleName;
}

export function processSourceModule(
    args: TransformUtilsArgs,
    project: EntityCore.Project,
    path1: string,
    file: File,
): Promise<HandleModulePromiseResult> {
    const moduleName = getModuleName(path1, project);
    if(!moduleName) {
        args.logger.error(`need module name for ${path1}`);
        throw new Error('need module name');
    }

    const moduleRepo = args.connection.getRepository(EntityCore.Module);

    const getOrCreateModule = (name: string): Promise<EntityCore.Module> => {
        if(!name) {
            throw new AppError(`invalid module name '${name}'`);
        }
        return moduleRepo.find({where: { project, name }, relations: ['project']})
            .then((modules): Promise<EntityCore.Module> => {
                if(!modules.length) {
                // console.log(`saving new module with ${name}`);
                    return moduleRepo.save(new EntityCore.Module(name, project, [], [], [], [], []));
                } else {
                    return Promise.resolve(modules[0]);
                }
            });
    };

    const handleModule = (
        module: EntityCore.Module
    ): Promise<HandleModulePromiseResult>    => {
        const moduleName = module.name;
        const context: ImportContext = {
            module: getModuleSpecifier(path1),
            moduleEntity: module,
        };
        const baseId = `handleModule-${module.id}`;
        args.logger.info(`handleModule ${baseId}`, { type: 'functionInvocation', module: module.toPojo() });
        const handleModuleResult: HandleModulePromiseResult = { id: baseId, success: false, hasResult: false };
        const handleImportSpecifier =
        // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-explicit-any
                (argument: any,
                    importContext: ImportContext,
                    importModuleName: string,
                    localName?: string,
                    exportedName?: string,
                    isDefault?: boolean,
                    isNamespace?: boolean): Promise<PromiseResult<EntityCore.Import>> => {
                    const handleImportSpecifierResult: PromiseResult<EntityCore.Import> = {
                        id: `handleImportSpecifier`,
                        success: false,
                        hasResult: false,
                    };
                    const importRepo = args.connection.getRepository(EntityCore.Import);
                    const nameRepo = args.connection.getRepository(EntityCore.Name);
                    const module = argument as EntityCore.Module;
                    if (localName === undefined) {
                        throw new AppError('no localName');
                    }
                    return ((): Promise<PromiseResult<EntityCore.Import>> =>
                        ((): Promise<PromiseResult<EntityCore.Name>> =>
                            nameRepo.find( { name: localName, module: importContext.moduleEntity })
                                .then((names): Promise<PromiseResult<EntityCore.Name>> => {
                                    const nameResult = { id:'namerepo.find', success: true,
                                        hasResult: false };
                                    if (names.length === 0) {
                                        const name = new EntityCore.Name();
                                        name.module = importContext.moduleEntity;
                                        name.name = localName;
                                        name.nameKind = 'import';
                                        return nameRepo.save(name).then((name_): PromiseResult<EntityCore.Name> => Object.assign({}, nameResult, { hasResult: true, success: true, result: name_ }));
                                    } else {
                                    // update the thing here
                                    //console.log(names);
                                    }
                                    return Promise.resolve(nameResult);
                                }))().then((): Promise<PromiseResult<EntityCore.Import>> => {
                            const importResult = { id:'importRepo.find', success: true, hasResult: false };
                            return importRepo.find({module, name: localName}).then((imports_): Promise<PromiseResult<EntityCore.Import>> => {
                                if (imports_.length === 0) {
                                    args.logger.debug('importModuleName', { importModuleName });
                                    const import_ = new EntityCore.Import(module, localName, importModuleName, exportedName, isDefault, isNamespace);
                                    return importRepo.save(import_)
                                        .then((import__): PromiseResult<EntityCore.Import> => { return { id: '', success: true, hasResult: true, result: import__ }; });
                                }
                                return Promise.resolve(importResult);
                            });
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        }))().then((lastResult): Promise<PromiseResult<EntityCore.Import>> => {
                        return Promise.resolve(Object.assign({}, handleImportSpecifierResult, { success: true, hasResult: false }));
                    });
                };

        // @ts-ignore
        const collection = j(file);
        return [
            (): Promise<PromiseResult<EntityCore.Import[][]>> => {
                args.logger.info('handling import declarations');
                return TransformUtils.handleImportDeclarations(
                    args,
                    collection.nodes()[0],
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    moduleName!,
                    context,
                    (importContext: ImportContext,
                        importName: string,
                        localName: string,
                        exportedName?: string,
                        isDefault?: boolean,
                        isNamespace?: boolean): Promise<PromiseResult<EntityCore.Import>> => handleImportSpecifier(
                        module,
                        importContext,
                        importName,
                        localName,
                        exportedName,
                        isDefault,
                        isNamespace));
            },
            (): Promise<PromiseResult<EntityCore.TSTypeAlias[]>> => {
                args.logger.debug('calling into ');
                return ProcessTypes.processTypeAliasDeclarations(args, module, collection.nodes()[0]);
            },
            (): Promise<PromiseResult<EntityCore.Class[]>> => {
                args.logger.debug('calling into processClassDeclarations');
                return ProcessClasses.processClassDeclarations(args, module, collection.nodes()[0]);
            },
            (): Promise<PromiseResult<EntityCore.Interface[]>> => {
                args.logger.debug('calling into processInterfaceDEclarations');
                return TransformUtils.processInterfaceDeclarations(args, module, collection.nodes()[0]);
            },
            (): Promise<PromiseResult<EntityCore.Export[]>> => {
                return TransformUtils.processExportDefaultDeclaration(args, module, collection.nodes()[0]);
            },
            (): Promise<PromiseResult<EntityCore.Export[]>> => {
                return TransformUtils.processExportNamedDeclarations(args, module, collection.nodes()[0]);
            },
            /*            (): Promise<void> => {
                return TransformUtils.processNames(args,module, collection.nodes()[0]);
            },*/
            /*      () => TransformUtils.processTypeDeclarations(args, module, collection.nodes()[0]), */
        // @ts-ignore eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-explicit-any
        ].reduce((a, v: () => Promise<any>): Promise<any> => a.then((r): Promise<any> => {
            const z = v();
            // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-explicit-any
            return z.then((cr): any[] => [...r, cr]).catch((error: Error): void => {
                args.logger.error('errorz', {error});
            });;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-explicit-any
        }), Promise.resolve([])).then((results: any[]): void => {
            //            args.logger.debug('results', {results});
        });
    };

    return getOrCreateModule(moduleName).then(handleModule);
}

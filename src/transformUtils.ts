/**
 * Collection of handy but oddly specific routines
 */
import path from 'path';
import assert,{strictEqual} from 'assert';
import {Promise} from 'bluebird';
// @ts-ignore
import j from 'jscodeshift';
import {namedTypes} from "ast-types/gen/namedTypes";
import {NodePath} from "ast-types/lib/node-path";
import EntityCore from "classModel/lib/src/entityCore";
import {
    ExportSpecifierKind,
//    ExportBatchSpecifierKind,
} from 'ast-types/gen/kinds';
import AppError from './AppError';
import {copyTree} from "./copyTree.prune";
import { myReduce, PromiseResult } from '@heptet/common';
export { myReduce }

import {HandleImportSpecifier, ImportContext, ModuleSpecifier} from './types';
import { visit } from "ast-types";
import {ProcessInterfaces} from './process/interfaces';
import { Args } from './types';
export type TransformUtilsArgs = Args<TransformUtils>;

export function getModuleSpecifier(path: string): ModuleSpecifier  {
    return path;
}

export class TransformUtils {
    /** @deprecated */
    public static processInterfaceDeclarations(
        args: TransformUtilsArgs,
        module: EntityCore.Module,
        file: namedTypes.File,
    ): Promise<PromiseResult<EntityCore.Interface[]>> {
        return ProcessInterfaces.processInterfaceDeclarations(args, module, file);
    }
    public static processTypeDeclarations(
        args: TransformUtilsArgs,
        module: EntityCore.Module,
        file: namedTypes.File,
    ): Promise<PromiseResult<EntityCore.TSType[]>> {
        const result = { id: 'processTypeDeclarations', success: false, hasResult: false };
        const inResult: PromiseResult<EntityCore.TSType[]> = { id: result.id, success: true, hasResult: true, result: [] };
        return myReduce(args.logger,
            // @ts-ignore
            j(file).find(namedTypes.TSTypeAliasDeclaration).nodes(), inResult, (t: namedTypes.TSTypeAliasDeclaration): Promise<PromiseResult<EntityCore.TSType>> => {
                if(t.id.type !== 'Identifier') {
                    throw new AppError(`unsupported declaration type ${t.id.type}`, t.id.type);
                }
                const t2 = t.typeAnnotation;

                // @ts-ignore
                return args.restClient.findTsType(module.id, copyTree(t2).toJS()).then((type_: EntityCore.TSType): Promise<PromiseResult<EntityCore.TSType[]>> => {
                    // @ts-ignore
                    return Promise.resolve(Object.assign({}, result, { result: type_, success: true, hasResult: true }));
                });
            });
    }

    public static handleImportDeclarations(
        args: TransformUtilsArgs,
        file: namedTypes.File,
        relativeBase: string,
        importContext: ImportContext,
        callback: HandleImportSpecifier,

    ): Promise<PromiseResult<EntityCore.Import[][]>> {
        const baseId = `handleImportDeclarations`;
        const inResult: PromiseResult<EntityCore.Import[][]> =
          { id: baseId, success: true, hasResult: true, result: [] };
        return myReduce(args.logger,
            // @ts-ignore
            j(file).find(namedTypes.ImportDeclaration,
                (n: namedTypes.ImportDeclaration): boolean => {
                    const r: boolean = /*n.importKind === 'value'
            && */n.source && n.source.type === 'StringLiteral'
            && n.source.value != null && /^\.\.?\//.test(n.source.value);
                    return r;
                }).nodes(),
            inResult,
            (importDecl: namedTypes.ImportDeclaration, index: number):
            Promise<PromiseResult<EntityCore.Import[]>> => {
                const innerInResult: PromiseResult<EntityCore.Import[]> = { id: `${baseId}-importDecl-${index}`, success: true,
                    result: [], hasResult: true };

                if(importContext.moduleEntity.project === undefined) {
                    args.logger.error('no project');
                    throw new Error('no project');
                } else {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion                args.logger.info('123', { path: importContext.moduleEntity.project.path! });
                }

                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const y = path.dirname(relativeBase);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const x = path.relative(importContext.moduleEntity.project!.path!, path.resolve(importContext.moduleEntity.project!.path!, relativeBase, '..', importDecl.source.value!.toString()));
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                args.logger.info('pathfinder', { x, y, relativeBase, value: importDecl.source.value! });
                const importModule: string = x;//importDecl.source.value != null && path.relative(importContext.moduleEntity.project!.path!, x) || '';


                const promises: (() => Promise<PromiseResult<EntityCore.Import>>)[] = [];
                visit(importDecl, {
                    visitImportNamespaceSpecifier(path: NodePath<namedTypes.ImportNamespaceSpecifier>): boolean {
                        const node = path.node;

                        promises.push((): Promise<PromiseResult<EntityCore.Import>> => {
                            if(!node.local) {
                                throw new AppError('!node.local', '!node.local');
                            }
                            return callback(importContext, importModule, node.local.name, undefined, false, true);
                        });

                        return false;
                    },
                    visitImportSpecifier(path: NodePath<namedTypes.ImportSpecifier>): boolean {
                        const node = path.node;
                        strictEqual(node.imported.type, 'Identifier');

                        promises.push((): Promise<PromiseResult<EntityCore.Import>> => {
                            if(!node.local) {
                                throw new AppError('!node.local', '!node.local 2');
                            }
                            return callback(importContext, importModule, node.local.name, node.imported.name, false, false);
                        });
                        return false;
                    },
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    visitImportDefaultSpecifier(path: NodePath<namedTypes.ImportDefaultSpecifier>): boolean {
                        promises.push((): Promise<PromiseResult<EntityCore.Import>> => {
                            if(!path.node.local) {
                                throw new AppError('undefined localName', 'undefined localName');
                            }
                            return callback(importContext, importModule, path.node.local.name, undefined, true, false);
                        });
                        return false;
                    }
                });
                return myReduce<() => Promise<PromiseResult<EntityCore.Import>>, EntityCore.Import>(args.logger, promises, innerInResult, (func: () => Promise<PromiseResult<EntityCore.Import>>): Promise<PromiseResult<EntityCore.Import>> => func());
            });
    }

    public static processExportNamedDeclarations(
        args: TransformUtilsArgs,
        module: EntityCore.Module,
        file: namedTypes.File
    ): Promise<PromiseResult<EntityCore.Export[]>> {
        const baseId = `processExportNamedDeclarations`;
        const result: PromiseResult<EntityCore.Export[]> = {
            success: false,
            hasResult: false,
            id: baseId,
        };
        args.logger.debug(baseId, { module: module.toPojo()});
        return myReduce(args.logger,
            // @ts-ignore
            j(file).find(namedTypes.ExportNamedDeclaration).nodes(),
            result,
            (node: namedTypes.ExportNamedDeclaration):
            Promise<PromiseResult<EntityCore.Export>> => {
                const exportRepo = args.connection.getRepository(EntityCore.Export);
                if(node.declaration) {
                    if (node.declaration.type === 'ClassDeclaration'
                        || node.declaration.type === 'TSInterfaceDeclaration'
                        || node.declaration.type === 'TSTypeAliasDeclaration') {
                        if(!node.declaration
                            || !node.declaration.id
                            || node.declaration.id.type !== 'Identifier'){
                            throw new AppError(`unsupported`, `unsupported`);
                        }
                        const exportedName = node.declaration.id
                            ? node.declaration.id.name
                            : undefined;
                        assert.ok(exportedName !== undefined);
                        return exportRepo.find({module, exportedName}).then((exports: EntityCore.Export[]): Promise<PromiseResult<EntityCore.Export>> => {
                            if (exports.length === 0) {
                                const export_ = new EntityCore.Export(exportedName, exportedName, module);
                                args.logger.debug(`saving export ${exportedName}`);
                                return exportRepo.save(export_).then((export__): Promise<PromiseResult<EntityCore.Export>> => {
                                    return Promise.resolve(Object.assign({}, result, { result: export__, success: true, hasResult: true }));
                                });
                            } else {
                                return Promise.resolve(Object.assign({}, result, { result: exports[0], succsss: true, hasResult: true }));

                                throw new AppError('should not be undefined', 'should not be undefined');
                            }
                        });
                    }
                    else if(node.declaration.type === 'FunctionDeclaration') {
                    } else if(node.declaration.type === 'VariableDeclaration') {
                    } else if(node.declaration.type === 'TSEnumDeclaration') {
                    } else{
                        throw new AppError(`unhandled ${node.declaration.type}`, node.declaration.type);
                    }
                } else {
                    if(node.specifiers && node.specifiers.length) {
                        const inResult: PromiseResult<EntityCore.Export[]> = {'id': 'specifiers', success: true, hasResult: true, result: []};
                        return myReduce<ExportSpecifierKind, EntityCore.Export>(
                            args.logger,
                            node.specifiers,
                            inResult,
                            // @ts-ignore
                            (specifier: ExportSpecifierKind): Promise<PromiseResult<EntityCore.Export[]>> => {
                            // @ts-ignore
                                return exportRepo.find({module, exportedName: specifier.exported.name}).then((exports): Promise<PromiseResult<EntityCore.Export>> => {
                                    if(exports.length === 0) {
                                        if(!specifier.local || !specifier.exported) {
                                            throw new AppError('cant deal', 'cant deal');
                                        }
                                        const export_ = new EntityCore.Export(
                                            specifier.local.name,
                                            specifier.exported.name,
                                            module,
                                        );
                                        args.logger.debug(`saving export ${export_}.name`);
                                        return exportRepo.save(export_).then((export__): Promise<PromiseResult<EntityCore.Export>> => {
                                            //@ts-ignore
                                            return Promise.resolve(Object.assign({},result, {hasResult: true, success: true, result:export__}));
                                        });
                                    } else {
                                    // @ts-ignore
                                        return Promise.resolve({...result, success: true});
                                    }
                                });
                            });
                    }
                }
                //@ts-ignore
                return Promise.resolve(result);
            });
    }

    public static processExportDefaultDeclaration(
        args: TransformUtilsArgs,
        module: EntityCore.Module,
        file: namedTypes.File,
    ): Promise<PromiseResult<EntityCore.Export[]>> {
        const baseId = `processExportDefaultDeclaration`;
        const result: PromiseResult<EntityCore.Export[]> = { success: false, hasResult: false, id: baseId };
        const inResult: PromiseResult<EntityCore.Export[]> = Object.assign({}, result,
            { success: true, hasResult: true, result: [] });
        return myReduce(
            args.logger,
            // @ts-ignore
            j(file).find(namedTypes.ExportDefaultDeclaration).nodes(),
            inResult,
            (n: namedTypes.ExportDefaultDeclaration): Promise<PromiseResult<EntityCore.Export>> => {
                const exportRepo = args.connection.getRepository(EntityCore.Export);
                let name: string |undefined = undefined;
                if (n.declaration.type === 'ClassDeclaration') {
                    if(n.declaration.id) {
                        name = n.declaration.id.name;
                    }
                } else if(n.declaration.type === 'Identifier') {
                    name = n.declaration.name;
                } else if(n.declaration.type === 'FunctionDeclaration') {
                } else if(n.declaration.type === 'TSDeclareFunction') {
                } else if(n.declaration.type === 'ObjectExpression') {
                    args.logger.debug(`object expression`);
                    args.logger.debug(copyTree(n.declaration).toJSON());
                } else {
                    throw new AppError(`unrecognized ype ${n.declaration.type}`, n.declaration.type);

                }

                return exportRepo.find({module, isDefaultExport: true})
                    .then((exports: EntityCore.Export[]): Promise<PromiseResult<EntityCore.Export>> => {
                        const exportResult: PromiseResult<EntityCore.Export> = { 'id': `${baseId}-findDefaultExportForModuleId${module.id}`, success: false, hasResult: false };
                        if(exports.length === 0) {
                            const export_ = new EntityCore.Export(name, undefined, module);
                            export_.isDefaultExport = true;
                            args.logger.debug(`saving export ${export_.name}`);
                            return exportRepo.save(export_).then((export_): Promise<PromiseResult<EntityCore.Export>> => {
                                return Promise.resolve(Object.assign({}, exportResult, { success: true, hasResult: true, result: export_ }));
                            });
                        }else {
                            const export_ = exports[0];
                            if(export_.name === name &&
                          export_.exportedName === undefined) {
                                return Promise.resolve(Object.assign({}, exportResult, { success: true, hasResult: true, result: export_}));
                            }

                            export_.name = name;
                            export_.exportedName = undefined;
                            args.logger.debug(`saving export ${export_.name}`);
                            return exportRepo.save(export_).catch((error: Error): Promise<PromiseResult<EntityCore.Export>> => {
                                args.logger.debug(`unable to persist class: ${error.message}`);
                                return Promise.resolve(Object.assign({}, exportResult, { success: false, hasResult: false }));
                                return Promise.resolve({ success: false, hasResult: false, id: result.id });
                            }).then((export_): Promise<PromiseResult<EntityCore.Export>> => {
                                return Promise.resolve(Object.assign({}, exportResult, { success: true, hasResult: true, result: export_}));
                            });
                        }
                    });
            });
    }

    /*    public static processNames(args: TransformUtilsArgs, module: EntityCore.Module, nodeElement: any): Promise<any> {
        return Promise.resolve(undefined);
    }
*/
}

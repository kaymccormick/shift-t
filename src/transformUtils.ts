import {Promise} from 'bluebird';
/**
 * Collection of handy but oddly specific routines
 */
import path from 'path';
import AppError from './AppError';
import j from 'jscodeshift';
import assert,{strictEqual} from 'assert';
import {namedTypes} from "ast-types/gen/namedTypes";
import {NodePath} from "ast-types/lib/node-path";
import EntityCore from "classModel/lib/src/entityCore";
import {copyTree} from "./utils";
import { ExportSpecifierKind, ExportBatchSpecifierKind}from 'ast-types/gen/kinds';

import {PromiseResult, HandleImportSpecifier, ImportContext, ModuleSpecifier} from './types';
import { visit } from "ast-types";
import {PatternKind} from "ast-types/gen/kinds";
import {ProcessInterfaces} from './process/interfaces';
import { Logger } from 'winston';

export function myReduce<I,O>(logger: Logger, input: I[], inputResult: PromiseResult<O[]>, callback: (element: I, index: number) => Promise<PromiseResult<O>>): Promise<PromiseResult<O[]>> {
// @ts-ignore
//    logger.info('myReduce');
    return input.map((elem, index): () => Promise<PromiseResult<O>> => {
        //        logger.debug('zz');
        return (): Promise<PromiseResult<O>> => {
            //            logger.debug('calling callback');
            let r: any|undefined = undefined;
            try {
                r = callback(elem, index);
                if(r === undefined) {
                    logger.debug("received undefined from callback", {r});
                }
            } catch(error) {
                logger.error('error', { error });
                r = () => Promise.resolve( { success: false, hasResult: false, error, id: 'myreduce' } );
            }

            return r;
        };
    }).reduce((a: Promise<PromiseResult<O[]>>,
        v: () => Promise<PromiseResult<O>>): Promise<PromiseResult<O[]>> => a.then((r: PromiseResult<O[]>): Promise<PromiseResult<O[]>> => {
        //        logger.info('calling func');
        // @ts-ignore
        let vR = v();
        //        console.log(vR);
        if(typeof vR === 'function') {
            throw new Error('too many function layers');
            //vR = vR();
        }
        return vR.catch((error: AppError): PromiseResult<O> => {
            logger.debug('reduce error', { error });
            return { success: false, hasResult: false, id: inputResult.id };
        }).then((cr: PromiseResult<O>): Promise<PromiseResult<O[]>> => {
            logger.info('myReduce2');
            r.result!.push(cr.result!);
            return Promise.resolve(r);
        }).catch((error: AppError): PromiseResult<O[]> => {
            logger.info('myReduce3');
            // @ts-ignore
            return { success: false, hasResult: false, error };
        });
    }), Promise.resolve({id: 'accumulator', success: true, hasResult: true, result: []} as PromiseResult<O[]>));


}


export function getModuleSpecifier(path: string): ModuleSpecifier  {
    return path;
}
import uuidv4 from 'uuid/v4';
import { Args } from './types';

export type TransformUtilsArgs = Args<TransformUtils>;

export class TransformUtils {
    public static processInterfaceDeclarations(
        args: TransformUtilsArgs,
        module: EntityCore.Module,
        file: namedTypes.File,
    ): Promise<any> {
        return ProcessInterfaces.processInterfaceDeclarations(args, module, file);
    }
    public static processTypeDeclarations(
        args: TransformUtilsArgs,
        module: EntityCore.Module,
        file: namedTypes.File,
    ): Promise<PromiseResult<any>> {
        const result = { id: 'processTypeDeclarations', success: false, hasResult: false };
        return j(file).find(namedTypes.TSTypeAliasDeclaration).nodes().map((t: namedTypes.TSTypeAliasDeclaration): () => Promise<void> => () => {
            if(t.id.type !== 'Identifier') {
                throw new AppError(`unsupported declaration type ${t.id.type}`, t.id.type);
            }
            const idName = t.id.name;
            const t2 = t.typeAnnotation;

            // @ts-ignore
            return args.restClient.findTsType(module.id, copyTree(t2).toJS()).then((type_: any) => {
            // @ts-ignore
                return Object.assign({}, result, { result: type_, success: true, hasResult: true });
            });
        }).reduce((a: Promise<PromiseResult<any>>, v: () => Promise<PromiseResult<any>>): Promise<PromiseResult<any>> => a.then(() => v().catch((error: AppError): PromiseResult<any> => {
            args.logger.error('errorzzzz', { error});
            return { id: error.id || 'unknown', success: false, hasResult: false} as PromiseResult<any>;
        })), Promise.resolve({success: false, hasResult: false, id: 'accumulator'} as PromiseResult<any>));
    }

    public static handleImportDeclarations1(
        file: namedTypes.File,
        relativeBase: string,
        importContext: ImportContext,
        callback: HandleImportSpecifier,

    ): Promise<void> {
        return j(file).find(namedTypes.ImportDeclaration,
            (n: namedTypes.ImportDeclaration): boolean => {
                const r: boolean = /*n.importKind === 'value'
            && */n.source && n.source.type === 'StringLiteral'
            && n.source.value != null && /^\.\.?\//.test(n.source.value);
                return r;
            })

            .nodes().map((importDecl: namedTypes.ImportDeclaration): () => Promise<void> => () => {
                const importModule = importDecl.source.value != null &&
            path.resolve(path.dirname(relativeBase), importDecl.source.value.toString()) || '';
                const promises: (() => Promise<void>)[] = [];
                visit(importDecl, {
                    visitImportNamespaceSpecifier(path: NodePath<namedTypes.ImportNamespaceSpecifier>): boolean {
                        const node = path.node;

                        promises.push(() => {
                            if(!node.local) {
                                throw new AppError('!node.local', '!node.local');
                            }
                            return callback(importContext, importModule, node.local.name, undefined, false, true).catch((error: Error): void => {
                                console.log(error.message);
                            });
                        });

                        return false;
                    },
                    visitImportSpecifier(path: NodePath<namedTypes.ImportSpecifier>): boolean {
                        const node = path.node;
                        strictEqual(node.imported.type, 'Identifier');

                        promises.push(() => {
                            if(!node.local) {
                                throw new AppError('!node.local', '!node.local 2');
                            }
                            return callback(importContext, importModule, node.local.name, node.imported.name, false, false).catch((error: Error): void => {
                                console.log(error.message);
                            });
                        });
                        return false;
                    },
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    visitImportDefaultSpecifier(path: NodePath<namedTypes.ImportDefaultSpecifier>): boolean {
                        promises.push(() => {
                            if(!path.node.local) {
                                throw new AppError('undefined localName', 'undefined localName');
                            }
                            return callback(importContext, importModule, path.node.local.name, undefined, true, false);
                        });
                        return false;
                    }
                });
                return promises.reduce((a: Promise<void>, v: () => Promise<void>): Promise<void> => a.then(() => v()), Promise.resolve(undefined));

            })
            .reduce((a: Promise<void>, v: () => Promise<void>): Promise<void> => a.then(() => v()), Promise.resolve(undefined));

    }

    public static handleImportDeclarations(
        args: TransformUtilsArgs,
        file: namedTypes.File,
        relativeBase: string,
        importContext: ImportContext,
        callback: HandleImportSpecifier,

    ): Promise<void> {
        return j(file).find(namedTypes.ImportDeclaration,
            (n: namedTypes.ImportDeclaration): boolean => {
                const r: boolean = /*n.importKind === 'value'
            && */n.source && n.source.type === 'StringLiteral'
            && n.source.value != null && /^\.\.?\//.test(n.source.value);
                return r;
            })

            .nodes().map((importDecl: namedTypes.ImportDeclaration): () => Promise<void> => () => {
                const importModule = importDecl.source.value != null &&
            path.resolve(path.dirname(relativeBase), importDecl.source.value.toString()) || '';
                const promises: (() => Promise<void>)[] = [];
                visit(importDecl, {
                    visitImportNamespaceSpecifier(path: NodePath<namedTypes.ImportNamespaceSpecifier>): boolean {
                        const node = path.node;

                        promises.push(() => {
                            if(!node.local) {
                                throw new AppError('!node.local', 'node.local', );
                            }
                            return callback(importContext, importModule, node.local.name, undefined, false, true).catch((error: Error): void => {
                                args.logger.debug(error.message);
                            });
                        });

                        return false;
                    },
                    visitImportSpecifier(path: NodePath<namedTypes.ImportSpecifier>): boolean {
                        const node = path.node;
                        strictEqual(node.imported.type, 'Identifier');

                        promises.push(() => {
                            if(!node.local) {
                                throw new AppError('!node.local', '!node.local');
                            }
                            return callback(importContext, importModule, node.local.name, node.imported.name, false, false).catch((error: Error): void => {
                                args.logger.debug(error.message);
                            });
                        });
                        return false;
                    },
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    visitImportDefaultSpecifier(path: NodePath<namedTypes.ImportDefaultSpecifier>): boolean {
                        promises.push(() => {
                            if(!path.node.local) {
                                throw new AppError('undefined localName', 'undefined localName');
                            }
                            return callback(importContext, importModule, path.node.local.name, undefined, true, false);
                        });
                        return false;
                    }
                });
                return promises.reduce((a: Promise<void>, v: () => Promise<void>): Promise<void> => a.then(() => v()), Promise.resolve(undefined));

            })
            .reduce((a: Promise<void>, v: () => Promise<void>): Promise<void> => a.then(() => v()), Promise.resolve(undefined));

    }

    public static processExportNamedDeclarations(
        args: TransformUtilsArgs,
        module: EntityCore.Module,
        file: namedTypes.File
    ): Promise<PromiseResult<EntityCore.Export[]>> {
        const result: PromiseResult<EntityCore.Export[]> = {
            success: false,
            hasResult: false,
            id: 'processExportNamedDeclarations',
        };
        args.logger.debug('processExportNamedDeclarations',
            { module: module.toPojo()});
        return myReduce(args.logger, j(file).find(namedTypes.ExportNamedDeclaration,
            (n: namedTypes.ExportNamedDeclaration): boolean => true
        ).nodes(), result, (node: namedTypes.ExportNamedDeclaration): Promise<PromiseResult<EntityCore.Export>> => {
            const exportRepo = args.connection.getRepository(EntityCore.Export);
            if(node.declaration) {
                if (node.declaration.type === 'ClassDeclaration'
                        || node.declaration.type === 'TSInterfaceDeclaration') {
                    if(!node.declaration
                            || !node.declaration.id
                            || node.declaration.id.type !== 'Identifier'){
                        throw new AppError(`unsupported`, `unsupported`);
                    }
                    const exportedName = node.declaration.id
                        ? node.declaration.id.name
                        : undefined;
                    assert.ok(exportedName !== undefined);
                    return exportRepo.find({module, exportedName}).then((exports: EntityCore.Export[]) => {
                        if (exports.length === 0) {
                            const export_ = new EntityCore.Export(exportedName, exportedName, module);
                            args.logger.debug('saving export');
                            return exportRepo.save(export_).then(export__ => {
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
                } else if(node.declaration.type === 'TSTypeAliasDeclaration') {
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
                        (specifier: ExportSpecifierKind): PromiseResult<EntityCore.Export[]> => {
                            // @ts-ignore
                            return exportRepo.find({module, exportedName: specifier.exported.name}).then(exports => {
                                if(exports.length === 0) {
                                    if(!specifier.local || !specifier.exported) {
                                        throw new AppError('cant deal', 'cant deal');
                                    }
                                    const export_ = new EntityCore.Export(
                                        specifier.local.name,
                                        specifier.exported.name,
                                        module,
                                    );
                                    args.logger.debug('saving export');
                                    return exportRepo.save(export_).then((export__) => {
                                        return Promise.resolve({ ...result, hasResult: true, success: true, result:export__});
                                    });
                                } else {
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

    public static processExportDefaultDeclaration(args: TransformUtilsArgs,
        module: EntityCore.Module,
        file: namedTypes.File): Promise<PromiseResult<any>> {
        const result: PromiseResult<any> = { success: false, hasResult: false, id: `processExportDefaultDeclaration`, };
        return j(file).find(namedTypes.ExportDefaultDeclaration).nodes().map((n: namedTypes.ExportDefaultDeclaration): () => Promise<PromiseResult<any>> => (): Promise<PromiseResult<any>> => {
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

            return exportRepo.find({module, isDefaultExport: true}).then((exports: EntityCore.Export[]) => {
                if(exports.length === 0) {
                    const export_ = new EntityCore.Export(name, undefined, module);
                    export_.isDefaultExport = true;
                    args.logger.debug('saving export');
                    return exportRepo.save(export_).then((export_) => {
                        return Promise.resolve({id: result.id, success: true, hasResult: true,
                            result: export_});
                    });
                }else {
                    const export_ = exports[0];
                    if(export_.localName === name &&
                          export_.exportedName === undefined) {
                        return Promise.resolve({success: true, hasResult: true, id: result.id, result: export_});
                    }

                    export_.localName= name;
                    export_.exportedName = undefined;
                    args.logger.debug('saving export');
                    return exportRepo.save(export_).catch((error: Error): PromiseResult<any> => {
                        args.logger.debug(`unable to persist class: ${error.message}`);
                        return { success: false, hasResult: false, id: result.id };
                    }).then((export_) => {
                        return Promise.resolve({success: true, hasResult: true,
                            id: result.id,
                            result: export_});
                    });
                }
            });
        }).reduce((a: Promise<PromiseResult<any>>, v: () => Promise<PromiseResult<any>>): Promise<PromiseResult<any>> => a.then(() => v().catch((error: Error): PromiseResult<any> => {
            args.logger.error('errorzzzz', { error});
            return { success: false, hasResult: false} as PromiseResult<any>;
        })), Promise.resolve({success: false, hasResult: false} as PromiseResult<any>));
    }

    public static processNames(args: TransformUtilsArgs, module: EntityCore.Module, nodeElement: any): Promise<any> {
        return Promise.resolve(undefined);
    }

    public static handleType(
        args: TransformUtilsArgs,
        moduleId: number,
        typeAnnotation: namedTypes.Node,
    ): Promise<PromiseResult<EntityCore.TSType>> {
        const result: PromiseResult<EntityCore.TSType> = { success: false, hasResult: false, id: 'handleType'};
        const iterationId = uuidv4();
        args.logger.info('handleType', { iterationId, astNode: copyTree(typeAnnotation).toJS() });
        const astNode: any = copyTree(typeAnnotation).toJS();
        // process.stderr.write(`handleType, looking for type ${JSON.stringify(astNode)}\n`);
        //@ts-ignore
        return args.restClient.findTsType(moduleId, astNode).then((type_: any): Promise<PromiseResult<EntityCore.TSType>> => type_ ?                     Promise.resolve({ success: true, hasResult: true, result: type_, id: result.id }) :
            args.restClient.createTsType(moduleId, astNode, 'propDecl').then((type_: EntityCore.TSType): PromiseResult<EntityCore.TSType> => {
                args.logger.debug(`created type ${type_}`);
                return { success: true, hasResult: true, result: type_, id: result.id };
            }).catch((error: Error): PromiseResult<any> => {
                if(error.stack) {
                    args.logger.debug(error.stack.toString());
                }
                args.logger.debug(`unable to create ts type via rest: ${error.message}: ${JSON.stringify(astNode)}`);
                args.logger.debug('returning undefined at line 637');
                return { success: false, hasResult: false, id: result.id };
            }));
    }
}

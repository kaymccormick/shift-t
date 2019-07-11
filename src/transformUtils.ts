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
import {PromiseResult, HandleImportSpecifier, ImportContext, ModuleSpecifier} from './types';
import { visit } from "ast-types";
import {PatternKind} from "ast-types/gen/kinds";
import File = namedTypes.File;
import {ProcessInterfaces} from './process/interfaces';
import { Logger } from 'winston';

function myReduce<I,O>(logger: Logger, input: I[], inputResult: PromiseResult<O>, callback: (element: I, index: number) => Promise<PromiseResult<O>>) {
// @ts-ignore
logger.info('myReduce');
    return input.map((elem, index): () => Promise<PromiseResult<O>> => {
    logger.debug('zz');
    return (): Promise<PromiseResult<O>> => {
    logger.debug('calling callback');
    let r: any|undefined = undefined;
    try {
        r = callback(elem, index);
    } catch(error) {
        logger.error('error', { error });
        r = () => Promise.resolve( { success: false, hasResult: false, error, id: 'myreduce' } );
    }
        
        return r;
        };
        }).reduce((a: Promise<PromiseResult<O[]>>,
        v: () => Promise<PromiseResult<O>>): Promise<PromiseResult<O[]>> => a.then((r: PromiseResult<O[]>): PromiseResult<O[]> => {
logger.info('calling func');
        // @ts-ignore
        return v().catch((error: AppError): PromiseResult<O> => {
        logger.debug('reduce error', { error });
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
        file: File,
    ): Promise<any> {
        return ProcessInterfaces.processInterfaceDeclarations(args, module, file);
    }
    /*
    public static processTypeDeclarations(
        args: TransformUtilsArgs,
        module: EntityCore.Module,
        file: File,
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
*/
    public static processClassDeclarations(
        args: TransformUtilsArgs,
        module: EntityCore.Module,
        file: File,
    ): Promise<PromiseResult<EntityCore.Class[]>> {
    // @ts-ignore
        const mainResult: PromiseResult<EntityCore.Class[]> = { id: 'processClassDeclarations', success: true, hasResult: true, result: [] };
        args.logger.info('processClassDeclarations', {type: 'main', module});
        const x = j(file).find(namedTypes.ClassDeclaration).nodes();
        args.logger.info('length', { length: x.length });
        // @ts-ignore              
        return myReduce<namedTypes.ClassDeclaration, EntityCore.Class>(args.logger, x, mainResult, (classDecl: namedTypes.ClassDeclaration): () => Promise<PromiseResult<EntityCore.Class>> => {
            args.logger.debug('callback in again');
            const classResult =  { id: 'processClassDeclarations.class', success: false, hasResult: false };
            if(!classDecl.id) {
            args.logger.error('no class name');
                throw new AppError('no class name', 'no-class-name');
            }
            const classIdName = classDecl.id.name;
            args.logger.info('processClassDeclarations1', { className: classIdName });

            const classRepo = args.connection.getRepository(EntityCore.Class);
            const nameRepo = args.connection.getRepository(EntityCore.Name);
            const m = copyTree(classDecl).remove('body');
            const superClass = m.get('superClass');

//@ts-ignore
            return (() => {
            const nameResult = { id: 'name', success: false, hasResult: false };
            return nameRepo.find({module, name: classIdName}).then((names): Promise<PromiseResult<EntityCore.Name>>  => {
                if(names.length === 0) {
                    const name = new EntityCore.Name();
                    name.name = classIdName;
                    name.nameKind = 'class';
                    name.module = module;
                    args.logger.debug('saving name');
                    return nameRepo.save(name).then((name_): Promise<PromiseResult<EntityCore.Name>> => {
                return Promise.resolve(Object.assign({}, nameResult, { result: name_, success: true, hasResult: true }));
                });
                } else {
                return Promise.resolve(Object.assign({}, nameResult, { result: names[0], success: true, hasResult: true }));
                }
                });
                })().then((): Promise<PromiseResult<EntityCore.Class>> => classRepo.find({module, name: classIdName}).then((classes): Promise<PromiseResult<EntityCore.Class>> => {
            args.logger.debug('found classes', { classes: classes.map(c => c.toPojo()) } );
                if(!classes.length) {
                    /* create new class instance */
                    const class_ = new EntityCore.Class(module, classIdName, [], []);
                    class_.astNode = m;
                    class_.superClassNode = m.get('superClass');
                    class_.implementsNode = m.get('implements');
                    args.logger.debug('saving class', { "class": class_.toPojo });
                    return classRepo.save(class_).then(class__ => {
                        return Promise.resolve(Object.assign({}, classResult, { result: class__, success: true, hasResult: true }));
                    });
                } else {
                    const class_ = classes[0];
                    class_.astNode = m;
                    class_.superClassNode = m.get('superClass');
                    class_.implementsNode = m.get('implements');
                    args.logger.debug('saving class');
                    return classRepo.save(class_).then(class__ => {
                        return Promise.resolve(Object.assign({}, classResult, { result: class__, success: true, hasResult: true }));
                    });
}
            }).then((classResult: PromiseResult<EntityCore.Class>) => {
                const promises: ([string, () => Promise<PromiseResult<any>>])[] = [];
                visit(classDecl, {
                    visitTSDeclareMethod(path: NodePath<namedTypes.TSDeclareMethod>): boolean {
                        promises.push(['a', () => TransformUtils.processClassMethod(args,classResult.result!, path.node)]);
                        return false;
                    },
                    visitClassMethod(path: NodePath<namedTypes.ClassMethod>): boolean {
                        promises.push([`b ClassMethod ${classResult.result!.name}`, () => TransformUtils.processClassMethod(args,classResult.result!, path.node)]);
                        return false;
                    },
                });
                args.logger.info('processClassDeclarations3');
                return promises.reduce((a: Promise<PromiseResult<any>>, v: [string, () => Promise<PromiseResult<any>>]): Promise<PromiseResult<any>> => a.then(() => v[1]().catch((error: AppError): PromiseResult<any> => {
                    return { id: error.id, success: false, hasResult: false, error };
                })), Promise.resolve({ ...mainResult, success: true }));
                }));
                });
    }

    public static handleImportDeclarations1(
        file: File,
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
        file: File,
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
        file: File
    ): Promise<void> {
        args.logger.debug('processExportNamedDeclarations', { module: module.toPojo()});
        return j(file).find(namedTypes.ExportNamedDeclaration,
            (n: namedTypes.ExportNamedDeclaration): boolean => true
        ).nodes().map(
            (node: namedTypes.ExportNamedDeclaration): () => Promise<void> => () => {
                return (() => {
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
                                    return exportRepo.save(export_).catch((error: Error): void => {
                                        args.logger.debug(`unable to persist export: ${error.message}`);
                                        throw error;

                                    });
                                } else {
                                    return Promise.resolve(exports[0]);
                                }
                                throw new AppError('should not be undefined', 'should not be undefined');
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
                            return node.specifiers.map((specifier): () => Promise<void> => () => {
                                return exportRepo.find({module, exportedName: specifier.exported.name}).then(exports => {
                                    if(exports.length === 0) {
                                        if(!specifier.local || !specifier.exported) {
                                            throw new AppError('cant deal', 'cant deal');
                                        }
                                        const export_ = new EntityCore.Export( specifier.local.name, specifier.exported.name, module);
                                        args.logger.debug('saving export');
                                        return exportRepo.save(export_).catch((error: Error): void => {
                                            args.logger.debug(`unable to persist class: ${error.message}`);
                                        }).then((export__) => undefined);
                                    } else {
                                        args.logger.error('undefined');
                                        return Promise.resolve(undefined);
                                    }
                                });
                            }).reduce((a: Promise<void>, v: () => Promise<void>): Promise<void> => a.then(() => v().catch((error: Error) => {
                                args.logger.error('error1', {error});
                            })), Promise.resolve(undefined));
                        }
                    }
                    args.logger.error('undefined1');

                    return Promise.resolve(undefined);
                })().then(() => undefined);
            }).reduce((a: Promise<void>, v: () => Promise<void>): Promise<void> => a.then(() => v().catch((error: Error) => {
            args.logger.error('error', {error});
        })), Promise.resolve(undefined));

    }


    public static processExportDefaultDeclaration(args: TransformUtilsArgs,
        module: EntityCore.Module,
        file: File): Promise<PromiseResult<any>> {
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
                    return exportRepo.save(export_)/*.catch((error: Error): void => {
                            args.logger.debug(`unable to persist class: ${error.message}`);
                        });*/.then((export_) => {
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
    public static processClassMethod(args: TransformUtilsArgs, moduleClass: EntityCore.Class, childNode: namedTypes.Node): Promise<PromiseResult<EntityCore.Method>> {
        args.logger.info(`processClassMethod `, { "class": moduleClass.toPojo() });
        const processClassMethodResult: PromiseResult<EntityCore.Method> = { id:'processClassMethod', success: false, hasResult: false};
        const methodDef = childNode as namedTypes.TSDeclareMethod|namedTypes.ClassMethod;
        const kind = methodDef.kind;
        const key = methodDef.key;
        if (kind !== "method") {
            return Promise.resolve(processClassMethodResult);
        }

        let methodName = '';
        if (key.type === "Identifier") {
            methodName = key.name;
        } else {
            args.logger.error('ast node type error', { expected: 'Identifier', got: key.type});
            throw new AppError('ast node type error', 'ast node type error');
        }

        const methodRepo = args.connection.getRepository(EntityCore.Method);
        return methodRepo.find({
            "classProperty": moduleClass,
            "name": methodName}).then((methods: EntityCore.Method[]): Promise<any> => {
            if(methods.length === 0) {
                const m = new EntityCore.Method(methodName, [], moduleClass);
                if(methodDef.accessibility) {
                    m.accessibility = methodDef.accessibility ;
                }
                args.logger.debug(`saving method ${m.name}`, { name: m.name });
                return methodRepo.save(m);
            } else {
                return Promise.resolve(methods[0]);
            }
        }).then((method: EntityCore.Method|undefined): Promise<PromiseResult<EntityCore.Method>> => {
            const methodResult: PromiseResult<EntityCore.Method> = { id: 'method', success: false, hasResult: false };
            if(!method) {
                return Promise.resolve(methodResult);
            }
            method.astNode = copyTree(methodDef).remove('body');
            args.logger.debug('updating ast Node in method');
            return methodRepo.save(method).then(method_ => {
                return Object.assign({}, methodResult, { result: method_, success: true, hasResult: true });
            });
        }).then((methodResult: PromiseResult<EntityCore.Method>): PromiseResult<any> => {
            if(!methodResult.hasResult) {
                return methodResult;
            }
            const params = methodDef.params;
            // @ts-ignore
            return myReduce<PatternKind, EntityCore.Parameter>(args.logger, params, {result: [], success: true, hasResult: true, id: 'hi'}, (pk: PatternKind, index: number): () => Promise<PromiseResult<EntityCore.Parameter>> => (): Promise<PromiseResult<EntityCore.Parameter>> => {
                    return ((): Promise<PromiseResult<EntityCore.TSType>> => { // IIFE
                        const typeResult: PromiseResult<EntityCore.TSType> = { success: false, id: 'parameter type',
                            hasResult: false };
                        args.logger.debug('parameter');
                        let name = '';
                        let type_ = undefined;
                        if (pk.type === 'Identifier')  {
                            name = pk.name;
                            if (pk.typeAnnotation) {
                                return this.handleType(args, moduleClass.moduleId!, pk.typeAnnotation.typeAnnotation).then((type_) => {
                                    args.logger.debug(`got type ${type_}`);
                                    //@ts-ignore
                                    return Promise.resolve(Object.assign({}, typeResult, { success: true, hasResult: true, result: type_ }));
                                });
                            }
                        } else if (pk.type === 'AssignmentPattern') {
                            name = pk.left.type === 'Identifier' ? pk.left.name : pk.left.type;
                        } else if (pk.type === 'RestElement') {
                        } else {
                            args.logger.error('type error', { type: pk.type });
                            throw new AppError('type error', 'type error');
                        }
                        return Promise.resolve(typeResult);
                    })().then((typeResult: PromiseResult<EntityCore.TSType>): Promise<PromiseResult<EntityCore.Parameter>> => {
                        const paramResult: PromiseResult<EntityCore.Parameter> = { success: true, hasResult: false, id: 'parameter' };
                        if(typeResult.success && typeResult.hasResult) {
                            const type = typeResult.result!;
                            if(!type && pk.type === 'Identifier' && pk.typeAnnotation) {
                                throw new AppError('no type', 'no type');
                            }
                            let name = '';
                            if (pk.type === 'Identifier')  {
                                name = pk.name;
                            }
                            if(!name) {
                                throw new AppError(`no name, ${pk.type}`, pk.type);
                            }
                            const parameter = new EntityCore.Parameter(name, methodResult.result!);
                            parameter.ordinal = index;
                            if(!type) {
                                throw new AppError('no type', 'no type');
                            }
                            parameter.typeId = type.id;
                            args.logger.debug(`persisting parameter ${parameter}`);
                            return args.connection.manager.save(parameter).then(parameter => {
                                //@ts-ignore
                                return Promise.resolve(Object.assign({}, paramResult, { success: true, hasResult: true, result: parameter }));
                            });
                        } else {
                            return Promise.resolve(paramResult);
                        }
                    });
                });
});
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

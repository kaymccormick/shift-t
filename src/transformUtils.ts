import {Promise} from 'bluebird';
/**
 * Collection of handy but oddly specific routines
 */
import path from 'path';
import j from 'jscodeshift';
import {strictEqual} from 'assert';
import {namedTypes} from "ast-types/gen/namedTypes";
import {NodePath} from "ast-types/lib/node-path";
import EntityCore from "classModel/lib/src/entityCore";
import {copyTree} from "./utils";
import {HandleImportSpecifier, ImportContext, ModuleSpecifier} from './types';
import {Connection, Repository} from "typeorm";
import { visit } from "ast-types";
import {PatternKind,TSTypeKind,TSTypeAnnotationKind} from "ast-types/gen/kinds";
import File = namedTypes.File;
export function getModuleSpecifier(path: string): ModuleSpecifier  {
    return path;
}
import uuidv4 from 'uuid/v4';
import { Args } from './types';

let logDebug = console.log;

export class TransformUtils {

    public static processInterfaceDeclarations(
        args: Args,
        module: EntityCore.Module,
        file: File,
    ): Promise<any> {
        const conn = args.connection;
        return j(file).find(namedTypes.TSInterfaceDeclaration).nodes().map((iDecl: namedTypes.TSInterfaceDeclaration): () => Promise<void> => () => {
            if(!iDecl.id) {
                throw new Error('no interface name');
            }
            if(iDecl.id.type !== 'Identifier') {
                throw new Error(`unsupported declaration type ${iDecl.id.type}`);
            }
            const idName = iDecl.id.name;

            if(iDecl.typeParameters) {
                iDecl.typeParameters.params.map((param: namedTypes.TSTypeParameter) => {
                });
            }

            const interfaceRepo = args.connection.getRepository(EntityCore.Interface);
            const nameRepo = args.connection.getRepository(EntityCore.Name);
            return nameRepo.find({module, name: idName}).then((names) => {
                if(names.length === 0) {
                    const name = new EntityCore.Name();
                    name.name = idName;
                    name.nameKind = 'interface';
                    name.module = module;
                    args.logger.debug('saving name');
                    return nameRepo.save(name).catch((error: Error): void => {
                        args.logger.debug(`unable to persist name: ${error.message}`);
                    }).then(() => undefined);
                } else {
                    const name = names[0];
                    name.nameKind = 'interface';
                    args.logger.debug('saving name');
                    return nameRepo.save(name).catch((error: Error): void => {
                        args.logger.debug(`unable to persist name: ${error.message}`);
                    });
                }
            }).then(() => interfaceRepo.find({where: {module, name: idName}, relations: ['module']})).then((interfaces): Promise<any> => {
                if(!interfaces.length) {
                    /* create new class instance */
                    const interface_ = new EntityCore.Interface()
                    interface_.module = module;
                    interface_.name = idName;
                    //                    class_.astNode = m;
                    interface_.astNode = copyTree(iDecl).toJS();
                    args.logger.debug('saving interface');
                    return interfaceRepo.save(interface_).catch((error: Error): void => {
                        args.logger.debug(`unable to persist interface: ${error.message}`);
                    });
                } else {
                    /* should check and update, no? */
                    return Promise.resolve(interfaces[0]);
                }
            }).then((interface_: EntityCore.Interface) => {
                if(!interface_) {
                    throw new Error('failure, no interface!');
                }
                return [() => TransformUtils.processPropertyDeclarations(args, interface_, iDecl), ...j(iDecl).find(namedTypes.TSMethodSignature).nodes().map((node: namedTypes.TSMethodSignature) => () => {
                    return TransformUtils.processInterfaceMethod(args, interface_, node)
                })].reduce((a: Promise<void>, v: () => Promise<void>): Promise<void> => a.then(() => v()), Promise.resolve(undefined));
            });
        }).reduce((a: Promise<void>, v: () => Promise<void>): Promise<void> => a.then(() => v()), Promise.resolve(undefined));
    }

    public static processTypeDeclarations(
        args: Args,
        module: EntityCore.Module,
        file: File,
    ): Promise<any> {
        return j(file).find(namedTypes.TSTypeAliasDeclaration).nodes().map((t: namedTypes.TSTypeAliasDeclaration): () => Promise<void> => () => {
            if(t.id.type !== 'Identifier') {
                throw new Error(`unsupported declaration type ${t.id.type}`);
            }
            const idName = t.id.name;
            args.logger.debug(`type alias ${idName}`);
            const t2 = t.typeAnnotation;

            // @ts-ignore
            return args.restClient.findTsType(module.id, copyTree(t2).toJS()).then((type_: any) => {
                args.logger.debug('i got type');
                args.logger.debug(type_);
            });

            const typeType = t2.type;
            args.logger.debug(`type is ! ${t2.type}`);
            return Promise.resolve(undefined);
        }).reduce((a: Promise<void>, v: () => Promise<void>): Promise<void> => a.then(() => v()), Promise.resolve(undefined));

    }

    public static processClassDeclarations(
        args: Args,
        module: EntityCore.Module,
        file: File,
    ): Promise<any> {
        return j(file).find(namedTypes.ClassDeclaration).nodes().map((classDecl: namedTypes.ClassDeclaration): () => Promise<any> => () => {
            if(!classDecl.id) {
                throw new Error('no class name');
            }
            const classIdName = classDecl.id.name;

            const classRepo = args.connection.getRepository(EntityCore.Class);
            const nameRepo = args.connection.getRepository(EntityCore.Name);
            const m = copyTree(classDecl).remove('body');
            const superClass = m.get('superClass');

            return nameRepo.find({module, name: classIdName}).then((names) => {
                if(names.length === 0) {
                    const name = new EntityCore.Name();
                    name.name = classIdName;
                    name.nameKind = 'class';
                    name.module = module;
                    args.logger.debug('saving name');
                    return nameRepo.save(name).catch((error: Error): void => {
                        args.logger.debug(`unable to persist class: ${error.message}`);
                    }).then(() => undefined);
                }
            }).then(() => classRepo.find({module, name: classIdName}).then((classes): Promise<any> => {
                if(!classes.length) {
                    /* create new class instance */
                    const class_ = new EntityCore.Class(module, classIdName, [], []);
                    class_.astNode = m;
                    class_.superClassNode = m.get('superClass');
                    class_.implementsNode = m.get('implements');
                    args.logger.debug('saving class');
                    return classRepo.save(class_).catch((error: Error): void => {
                        args.logger.debug(`unable to persist class: ${error.message}`);
                    });
                } else {
                    const class_ = classes[0];
                    class_.astNode = m;
                    class_.superClassNode = m.get('superClass');
                    class_.implementsNode = m.get('implements');
                    args.logger.debug('saving class');
                    return classRepo.save(class_).catch((error: Error): void => {
                        args.logger.debug(`unable to persist class: ${error.message}`);
                    });
                }
            }).then((class_: EntityCore.Class) => {
                const promises: (() => Promise<void>)[] = [];
                //                args.logger.debug(classDecl.body.body.map(n => n.type));
                visit(classDecl, {
                    visitTSDeclareMethod(path: NodePath<namedTypes.TSDeclareMethod>): boolean {
                        promises.push(() => TransformUtils.processClassMethod(args,class_, path.node));
                        return false;
                    },
                    visitClassMethod(path: NodePath<namedTypes.ClassMethod>): boolean {
                        promises.push(() => TransformUtils.processClassMethod(args,class_, path.node));
                        return false;
                    },
                });
                return promises.reduce((a: Promise<void>, v: () => Promise<void>): Promise<void> => a.then(() => v()), Promise.resolve(undefined)).then(() =>undefined);
            }));
        })            .reduce((a: Promise<void>, v: () => Promise<void>): Promise<void> => a.then(() => v()), Promise.resolve(undefined));
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
                                throw new Error('!node.local');
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
                                throw new Error('!node.local');
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
                                throw new Error('undefined localName');
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
        args: Args,
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
                                throw new Error('!node.local');
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
                                throw new Error('!node.local');
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
                                throw new Error('undefined localName');
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
        args: Args,
        module: EntityCore.Module,
        file: File
    ): Promise<void> {
        return ((): (() => Promise<any>)[] => {
            return j(file).find(namedTypes.ExportNamedDeclaration,
                (n: namedTypes.ExportNamedDeclaration): boolean => true
            /*                (n.source && n.declaration
        && (!n.specifiers || n.specifiers.length === 0) || false)*/
            ).nodes().map(
                (node: namedTypes.ExportNamedDeclaration): () => Promise<any> => () => {
                    const exportRepo = args.connection.getRepository(EntityCore.Export);
                    if(node.declaration) {
                        if (node.declaration.type === 'ClassDeclaration'
                        || node.declaration.type === 'TSInterfaceDeclaration') {
                            if(!node.declaration || !node.declaration.id || node.declaration.id.type !== 'Identifier'){
                                throw new Error(`unsupported`);
                            }
                            const exportedName = node.declaration.id ? node.declaration.id.name : undefined;
                            if (exportedName === undefined) {
                                throw new Error('no name');
                            }
                            return exportRepo.find({module, exportedName}).then((exports: EntityCore.Export[]) => {
                                if (exports.length === 0) {
                                    const export_ = new EntityCore.Export(exportedName, exportedName, module);
                                    args.logger.debug('saving export');
                                    return exportRepo.save(export_).catch((error: Error): void => {
                                        args.logger.debug(`unable to persist export: ${error.message}`);
                                    });
                                } else {

                                }
                                return Promise.resolve(undefined);
                            });
                        }
                        else if(node.declaration.type === 'FunctionDeclaration') {
                        } else if(node.declaration.type === 'VariableDeclaration') {
                        } else if(node.declaration.type === 'TSEnumDeclaration') {
                        } else if(node.declaration.type === 'TSTypeAliasDeclaration') {
                        } else{
                            throw new Error(`unhandled ${node.declaration.type}`);
                        }
                    } else {
                        if(node.specifiers && node.specifiers.length) {
                            return node.specifiers.map((specifier): () => Promise<void> => () => {
                                return exportRepo.find({module, exportedName: specifier.exported.name}).then(exports => {
                                    if(exports.length === 0) {
                                        if(!specifier.local || !specifier.exported) {
                                            throw new Error('cant deal');
                                        }
                                        const export_ = new EntityCore.Export( specifier.local.name, specifier.exported.name, module);
                                        args.logger.debug('saving export');
                                        return exportRepo.save(export_).catch((error: Error): void => {
                                            args.logger.debug(`unable to persist class: ${error.message}`);
                                        }).then((export__) => undefined);
                                    }else{
                                        return Promise.resolve(undefined);
                                    }
                                });
                            }).reduce((a: Promise<void>, v: () => Promise<void>): Promise<void> => a.then(() => v()), Promise.resolve(undefined));
                        }
                    }
                    return Promise.resolve(undefined);
                });
        })()            .reduce((a: Promise<void>, v: () => Promise<void>): Promise<void> => a.then(() => v()), Promise.resolve(undefined));
        
    }


    public static processExportDefaultDeclaration(args: Args,
        module: EntityCore.Module,
        file: File): Promise<any> {
        return (() => {
            return j(file).find(namedTypes.ExportDefaultDeclaration).nodes().map((n: namedTypes.ExportDefaultDeclaration): () => Promise<any> => () => {
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
                    throw new Error(`unrecognized ype ${n.declaration.type}`);

                }

                return exportRepo.find({module, isDefaultExport: true}).then((exports: EntityCore.Export[]) => {
                    if(exports.length === 0) {
                        const export_ = new EntityCore.Export(name, undefined, module);
                        export_.isDefaultExport = true;
                        args.logger.debug('saving export');
                        return exportRepo.save(export_).catch((error: Error): void => {
                            args.logger.debug(`unable to persist class: ${error.message}`);
                        });
                    }else {
                        const export_ = exports[0];
                        if(export_.localName !== name ||
                          export_.exportedName !== undefined) {
                            export_.localName= name;
                            export_.exportedName = undefined;
                            args.logger.debug('saving export');
                            return exportRepo.save(export_).catch((error: Error): void => {
                                args.logger.debug(`unable to persist class: ${error.message}`);
                            });
                        }
                    }
                    return Promise.resolve(undefined);
                });

                //thisModule.defaultExport = name;
                return Promise.resolve(undefined);
            })})().reduce((a: Promise<void>, v: () => Promise<void>): Promise<void> => a.then(() => v()), Promise.resolve(undefined));
    }
    public static processClassMethod(args: Args, moduleClass: EntityCore.Class, childNode: namedTypes.Node): Promise<any> {
        process.stderr.write(`processClassMethod `);
        const methodDef = childNode as namedTypes.TSDeclareMethod|namedTypes.ClassMethod;
        const kind = methodDef.kind;
        const key = methodDef.key;
        if (kind === "method") {
            let methodName = '';
            if (key.type === "Identifier") {
                methodName = key.name;
                process.stderr.write(`${methodName}\n`);
            } else {
                throw new Error(key.type);
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

                    args.logger.debug(`saving method ${m.name}`);
                    return methodRepo.save(m).catch((error: Error): undefined|Promise<void> =>{
                        args.logger.debug(`unable to save method: ${error.message}`);
                        return Promise.resolve(undefined);
                    });
                } else {
                    return Promise.resolve(methods[0]);
                }
            }).then((method: EntityCore.Method|undefined): Promise<any> => {
                if(!method) {
                    return Promise.resolve(undefined);
                }
                method.astNode = copyTree(methodDef).remove('body');
                args.logger.debug('updating ast Node in method');
                return methodRepo.save(method).catch((error: Error): void => {
                    args.logger.debug(`unable to persist method: ${error.message}`);
                });
            }).then((method: EntityCore.Method|undefined): Promise<any> => {
                if(!method) {Promise.resolve(undefined);}
                const params = methodDef.params;
                return params.map(
                    (pk: PatternKind, index: number): () => Promise<void> => (): Promise<void> => {
                        return ((): Promise<any> => {
                            let name = '';
                            let type_ = undefined;
                            if (pk.type === 'Identifier')  {
                                name = pk.name;
                                if (pk.typeAnnotation) {
                                    return this.handleType(args, moduleClass.moduleId!, pk.typeAnnotation.typeAnnotation).then(type_ => {
                                        args.logger.debug(`got type ${type_}`);
                                        return type_;
                                    }).catch((error: Error): void => {
                                        args.logger.debug(`unable to handle type: ${error.message}`);
                                    });
                                }
                            } else if (pk.type === 'AssignmentPattern') {
                                name = pk.left.type === 'Identifier' ? pk.left.name : pk.left.type;
                            } else if (pk.type === 'RestElement') {
                            } else {
                                throw new Error(pk.type);
                            }
                            return Promise.resolve(undefined);
                        })().then(type => {
                            if(!type && pk.type === 'Identifier' && pk.typeAnnotation) {
                                throw new Error('no type');
                            }
                            let name = '';
                            if (pk.type === 'Identifier')  {
                                name = pk.name;
                            }
                            if(!name) {
                                throw new Error(`no name, ${pk.type}`);
                            }
                            const parameter = new EntityCore.Parameter(name, method!);
                            parameter.ordinal = index;
                            if(!type) {
                                throw new Error('no type');
                            }
                            parameter.typeId = type.id;
                            args.logger.debug(`persisting parameter ${parameter}`);
                            return args.connection.manager.save(parameter).catch((error: Error): void => {
                                args.logger.debug(`unable to persist parameter: ${error.message}`);
                            }).catch((error: Error): void => {
                                args.logger.debug(`unable to process class method: ${error.message}`);
                            }).then(() => undefined);

                        });
                    }).reduce((a: Promise<void>, v: () => Promise<void>): Promise<void> => a.then(() => v()), Promise.resolve(undefined)).then(() =>undefined);
            });
        }
        return Promise.resolve(undefined);
    }
    public static processInterfaceMethod(args: Args, iface: EntityCore.Interface, childNode: namedTypes.TSMethodSignature): Promise<void> {
        process.stderr.write(`processInterfaceMethod\n`);
        const methodDef = childNode;
        const key = methodDef.key;
        let methodName = '';
        if (key.type === "Identifier") {
            methodName = key.name;
        } else {
            throw new Error(key.type);
        }

        const methodRepo = args.connection.getRepository(EntityCore.InterfaceMethod);
        return methodRepo.find({
            interface_: iface,
            "name": methodName}).then((methods: EntityCore.InterfaceMethod[]): Promise<any> => {
            if(methods.length === 0) {
                const m = new EntityCore.InterfaceMethod()
                m.name = methodName;
                m.interface_ = iface;
                /*                    if(methodDef.accessibility) {
                        m.accessibility = methodDef.accessibility ;
                    }*/
                args.logger.debug('saving method');
                return methodRepo.save(m).catch((error: Error): void => {
                    args.logger.debug(`unable to method class: ${error.message}`);
                });
            } else {
                return Promise.resolve(methods[0]);
            }
        }).then((method: EntityCore.InterfaceMethod): Promise<any> => {
            method.astNode = copyTree(methodDef);
            args.logger.debug('saving method');
            return methodRepo.save(method).catch((error: Error): void => {
                args.logger.debug(`unable to persist method: ${error.message}`);
            });
        }).then((method: EntityCore.InterfaceMethod) => {
        });
        return Promise.resolve(undefined);
    }

    public static processNames(args: Args, module: EntityCore.Module, nodeElement: any): Promise<any> {
        return Promise.resolve(undefined);
    }
    public static processPropertyDeclarations(        args: Args,
        iface: EntityCore.Interface,
        inNode: namedTypes.Node,
    ): Promise<any>
    {
        args.logger.debug('here');
        if(!iface.module) {
            throw new Error('need module');
        }
        return j(inNode).find(namedTypes.TSPropertySignature).nodes().map((n: namedTypes.TSPropertySignature) => () => {
            if(n.key.type !== 'Identifier') {
                throw new Error(`unsupported key type ${n.key.type}`);
            }
            const propName = n.key.name;
            args.logger.debug(`name is ${n.key.name}`);
            const propertyRepo = args.connection.getRepository(EntityCore.InterfaceProperty);

            ((): Promise<any> => {
                if(n.typeAnnotation != null) {
                    args.logger.debug('here it is');
                    return this.handleType(args, iface.module!.id!, n.typeAnnotation.typeAnnotation);
                } else {throw new Error('beep');
                    return Promise.resolve(undefined);
                }
            })().then((type: EntityCore.TSType|undefined): Promise<any> => {
                if (type) {
                    if (n.typeAnnotation) {
                        const t1 = n.typeAnnotation.typeAnnotation;
                        args.logger.debug(`t1.type is ${t1.type}`);
                        //this.handleTypeAnnotation(args);
                    }
                }
                // @ts-ignore
                return propertyRepo.find({iface, property: { name: propName }}
                ).then((props: EntityCore.InterfaceProperty[]): Promise<any> => {
                    if(props.length === 0) {
                        const p = new EntityCore.InterfaceProperty();
                        p.iface = iface;
                        p.property = new EntityCore.Property();
                        if(!type) {
                            throw new Error('no type');
                        }
                        
                        p.property.type = type;
                        p.property.name = propName;
                        p.property.computed = n.computed;
                        p.property.readonly = n.readonly;
                        p.property.optional = n.optional;
                        p.property.hasInitializer = n.initializer != null;
                        p.property.astNode = copyTree(n).toJS();

                        args.logger.debug('saving property');
                        return propertyRepo.save(p).catch((error: Error): Promise<any> => {
                            args.logger.debug('unable to save property');
                            return Promise.resolve(undefined);
                        });
                    } else {
                        args.logger.debug('returning existing property');
                        return Promise.resolve(props[0]);
                    }

                }).catch((error: Error): void => {
                    args.logger.debug(`error is ${error.message}`);
                });
            });
        }).reduce((a: Promise<void>, v: () => Promise<void>): Promise<void> => a.then(() => v()), Promise.resolve(undefined));
    }

    public static handleType(args: Args, moduleId: number, typeAnnotation: namedTypes.Node): Promise<EntityCore.TSType|undefined> {
        const iterationId = uuidv4();
        args.logger.info('handleType', { iterationId, astNode: copyTree(typeAnnotation).toJS() });
        const r: Promise<any> = ((): Promise<any> => {
            const astNode: any = copyTree(typeAnnotation).toJS();
            //        process.stderr.write(`handleType, looking for type ${JSON.stringify(astNode)}\n`);
            //@ts-ignore
            return args.restClient.findTsType(moduleId, astNode).then((type_: any): Promise<any> => {
                if(!type_) {
                    args.logger.debug('creating type');
                    // @ts-ignore
                    return args.restClient.createTsType(moduleId, astNode, 'propDecl').catch((error: Error): void => {
                        if(error.stack) {
                            args.logger.debug(error.stack.toString());
                        }
                        args.logger.debug(`unable to create ts type via rest: ${error.message}: ${JSON.stringify(astNode)}`);
                        return undefined;
                    }).then((type_: EntityCore.TSType): EntityCore.TSType => {
                        args.logger.debug(`created type ${type_}`);
                        return type_;
                    });
                } else {
                    args.logger.debug('found type');
                    args.logger.info('handledType', { iterationId, tstype: type_.toPojo(), astNode: copyTree(typeAnnotation).toJS() });
                    return type_;
                }
            });
        })().then((arg: any): any => {
            args.logger.info('exit handledType', { iterationId });
            return arg;
        });
        return r;
    }
}

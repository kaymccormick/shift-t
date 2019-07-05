/**
 * Collection of handy but oddly specific routines
 */
import path from 'path';
import j from 'jscodeshift';
import {strictEqual} from 'assert';
import {namedTypes} from "ast-types/gen/namedTypes";
import {NodePath} from "ast-types/lib/node-path";
import {EntityCore} from "classModel";
import {copyTree} from "./utils";
import {HandleImportSpecifier, ImportContext, ModuleSpecifier} from './types';
import {Connection, Repository} from "typeorm";
import { visit } from "ast-types";
import {PatternKind,TSTypeKind} from "ast-types/gen/kinds";
import File = namedTypes.File;
export function getModuleSpecifier(path: string): ModuleSpecifier  {
    return path;
}

let logDebug = console.log;

export class TransformUtils {

    public static processInterfaceDeclarations(
        connection: Connection,
        module: EntityCore.Module,
        file: File,
    ): Promise<any> {
        const conn = connection;
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

            const interfaceRepo = connection.getRepository(EntityCore.Interface);
            const nameRepo = connection.getRepository(EntityCore.Name);
            return nameRepo.find({module, name: idName}).then((names) => {
                if(names.length === 0) {
                    const name = new EntityCore.Name();
                    name.name = idName;
                    name.nameKind = 'interface';
                    name.module = module;
                    return nameRepo.save(name).then(() => undefined);
                } else {
                const name = names[0];
                name.nameKind = 'interface';
                return nameRepo.save(name);
                }
            }).then(() => interfaceRepo.find({where: {module, name: idName}, relations: ['module']})).then(interfaces => {
                if(!interfaces.length) {
                    /* create new class instance */
                    const interface_ = new EntityCore.Interface()
                    interface_.module = module;
                    interface_.name = idName;
                    //                    class_.astNode = m;
                    interface_.astNode = copyTree(iDecl).toJS();
                    return interfaceRepo.save(interface_);
                } else {
                    /* should check and update, no? */
                    return Promise.resolve(interfaces[0]);
                }
                }).then((interface_: EntityCore.Interface) => {
                if(!interface_) {
                    throw new Error('failure, no interface!');
                }
                [() => TransformUtils.processPropertyDeclarations(conn, interface_, iDecl), ...j(iDecl).find(namedTypes.TSMethodSignature).nodes().map((node: namedTypes.TSMethodSignature) => () => {
                    return TransformUtils.processInterfaceMethod(connection, interface_, node)
                })].reduce((a: Promise<void>, v: () => Promise<void>): Promise<void> => a.then(() => v()), Promise.resolve(undefined));
});
}).reduce((a: Promise<void>, v: () => Promise<void>): Promise<void> => a.then(() => v()), Promise.resolve(undefined));
    }

    public static processTypeDeclarations(
        connection: Connection,
        module: EntityCore.Module,
        file: File,
    ): Promise<any> {
        return j(file).find(namedTypes.TSTypeAliasDeclaration).nodes().map((t: namedTypes.TSTypeAliasDeclaration): () => Promise<void> => () => {
            if(t.id.type !== 'Identifier') {
                throw new Error(`unsupported declaration type ${t.id.type}`);
            }
            const idName = t.id.name;
            const t2 = t.typeAnnotation;
            const tsTypeRepo = connection.getRepository(EntityCore.TSType);
            const typeType = t2.type;
            console.log(`type is ! ${t2.type}`);
            return Promise.resolve(undefined);
        }).reduce((a: Promise<void>, v: () => Promise<void>): Promise<void> => a.then(() => v()), Promise.resolve(undefined));

    }

    public static processClassDeclarations(
        connection: Connection,
        module: EntityCore.Module,
        file: File,
    ): Promise<any> {
        return j(file).find(namedTypes.ClassDeclaration).nodes().map((classDecl: namedTypes.ClassDeclaration): () => Promise<any> => () => {
            if(!classDecl.id) {
                throw new Error('no class name');
            }
            const classIdName = classDecl.id.name;

            const classRepo = connection.getRepository(EntityCore.Class);
            const nameRepo = connection.getRepository(EntityCore.Name);
            const m = copyTree(classDecl).remove('body');
            const superClass = m.get('superClass');

            return nameRepo.find({module, name: classIdName}).then((names) => {
                if(names.length === 0) {
                    const name = new EntityCore.Name();
                    name.name = classIdName;
                    name.nameKind = 'class';
                    name.module = module;
                    return nameRepo.save(name).then(() => undefined);
                }
            }).then(() => classRepo.find({module, name: classIdName}).then(classes => {
                if(!classes.length) {
                    /* create new class instance */
                    const class_ = new EntityCore.Class(module, classIdName, [], []);
                    class_.astNode = m;
                    class_.superClassNode = m.get('superClass');
                    class_.implementsNode = m.get('implements');
                    return classRepo.save(class_);
                } else {
                    const class_ = classes[0];
                    class_.astNode = m;
                    class_.superClassNode = m.get('superClass');
                    class_.implementsNode = m.get('implements');
                    return classRepo.save(class_);
                }
            }).then((class_: EntityCore.Class) => {
                const promises: Promise<void>[] = [];
                console.log(classDecl.body.body.map(n => n.type));
                visit(classDecl, {
                    visitTSDeclareMethod(path: NodePath<namedTypes.TSDeclareMethod>): boolean {
                        promises.push(TransformUtils.processClassMethod(connection,class_, path.node));
                        return false;
                    },
                    visitClassMethod(path: NodePath<namedTypes.ClassMethod>): boolean {
                        promises.push(TransformUtils.processClassMethod(connection,class_, path.node));
                        return false;
                    },
                });
                return promises.reduce((a: Promise<void>, v: Promise<void>): Promise<void> => a.then(() => v), Promise.resolve(undefined)).then(() => undefined);
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

    public static processExportNamedDeclarations(
        connection: Connection,
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
                    const exportRepo = connection.getRepository(EntityCore.Export);
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
                                    return exportRepo.save(export_);
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
                                        return exportRepo.save(export_).then((export__) => undefined);
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


    public static processExportDefaultDeclaration(        connection: Connection,
        module: EntityCore.Module,
        file: File): Promise<void> {
        return (() => {
            return j(file).find(namedTypes.ExportDefaultDeclaration).nodes().map((n: namedTypes.ExportDefaultDeclaration): () => Promise<void> => () => {
                const exportRepo = connection.getRepository(EntityCore.Export);
                let name: string |undefined = undefined;
                if (n.declaration.type === 'ClassDeclaration') {
                    if(n.declaration.id) {
                        name = n.declaration.id.name;
                    }
                } else if(n.declaration.type === 'Identifier') {
                    name = n.declaration.name;
                } else if(n.declaration.type === 'FunctionDeclaration') {
                } else if(n.declaration.type === 'ObjectExpression') {
                    console.log(`object expression`);
                    console.log(copyTree(n.declaration).toJSON());
                } else {
                    throw new Error(`unrecognized ype ${n.declaration.type}`);

                }

                exportRepo.find({module, isDefaultExport: true}).then((exports: EntityCore.Export[]) => {
                    if(exports.length === 0) {
                        const export_ = new EntityCore.Export(name, undefined, module);
                        export_.isDefaultExport = true;
                        return exportRepo.save(export_);
                    }else {
                        const export_ = exports[0];
                        if(export_.localName !== name ||
                          export_.exportedName !== undefined) {
                            export_.localName= name;
                            export_.exportedName = undefined;
                            return exportRepo.save(export_);
                        }
                    }
                    return Promise.resolve(undefined);
                });

                //thisModule.defaultExport = name;
                return Promise.resolve(undefined);
            })})().reduce((a: Promise<void>, v: () => Promise<void>): Promise<void> => a.then(() => v()), Promise.resolve(undefined));
    }
    public static processClassMethod(connection: Connection, moduleClass: EntityCore.Class, childNode: namedTypes.Node): Promise<void> {
        process.stderr.write(`processClassMethod\n`);
        const methodDef = childNode as namedTypes.TSDeclareMethod|namedTypes.ClassMethod;
        const kind = methodDef.kind;
        const key = methodDef.key;
        if (kind === "method") {
            let methodName = '';
            if (key.type === "Identifier") {
                methodName = key.name;
            } else {
                throw new Error(key.type);
            }

            const methodRepo = connection.getRepository(EntityCore.Method);
            return methodRepo.find({
                "classProperty": moduleClass,
                "name": methodName}).then((methods: EntityCore.Method[]) => {
                if(methods.length === 0) {
                    const m = new EntityCore.Method(methodName, [], moduleClass);
                    if(methodDef.accessibility) {
                        m.accessibility = methodDef.accessibility ;
                    }
                    return methodRepo.save(m);
                } else {
                    return methods[0];
                }
            }).then((method: EntityCore.Method) => {
                method.astNode = copyTree(methodDef).remove('body');
                return methodRepo.save(method);
            }).then((method: EntityCore.Method) => {
                const params = methodDef.params;
                params.forEach(
                    (pk: PatternKind): void => {
                        let name = '';
                        console.log(`[${methodName}] pk type is ${pk.type}`);
                        let type_ = undefined;
                        if (pk.type === 'Identifier')  {
                            name = pk.name;
                            if (pk.typeAnnotation) {
                                const annotation = pk.typeAnnotation.typeAnnotation;
                                // least complex arrangement is one of these
                                if(annotation.type === 'TSTypeAnnotation' || annotation.type === 'TSTypePredicate') {
                                } else { // TSTypeKind
                                    const typ: TSTypeKind = annotation as TSTypeKind;
                                    console.log(`typekind if ${typ.type}`);
                                }
                            }
                        } else if (pk.type === 'AssignmentPattern') {
                            name = pk.left.type === 'Identifier' ? pk.left.name : pk.left.type;
                        } else if (pk.type === 'RestElement') {
                        } else {
                            throw new Error(pk.type);
                        }
                        //                    method.addParam(name, type_);
                        //                    moduleClass.methods = moduleClass.methods.set(name, method);
                    });
            });
        }
        return Promise.resolve(undefined);
    }
    public static processInterfaceMethod(connection: Connection, iface: EntityCore.Interface, childNode: namedTypes.TSMethodSignature): Promise<void> {
        process.stderr.write(`processInterfaceMethod\n`);
        const methodDef = childNode;
        const key = methodDef.key;
        let methodName = '';
        if (key.type === "Identifier") {
            methodName = key.name;
        } else {
            throw new Error(key.type);
        }

        const methodRepo = connection.getRepository(EntityCore.InterfaceMethod);
        return methodRepo.find({
            interface_: iface,
            "name": methodName}).then((methods: EntityCore.InterfaceMethod[]) => {
            if(methods.length === 0) {
                const m = new EntityCore.InterfaceMethod()
                m.name = methodName;
                m.interface_ = iface;
                /*                    if(methodDef.accessibility) {
                        m.accessibility = methodDef.accessibility ;
                    }*/
                return methodRepo.save(m);
            } else {
                return methods[0];
            }
        }).then((method: EntityCore.InterfaceMethod) => {
            method.astNode = copyTree(methodDef);
            return methodRepo.save(method);
        }).then((method: EntityCore.InterfaceMethod) => {
        });
        return Promise.resolve(undefined);
    }

    public static processNames(connection: Connection, module: EntityCore.Module, nodeElement: any): Promise<any> {
        return Promise.resolve(undefined);
    }
    public static processPropertyDeclarations(        connection: Connection,
        iface: EntityCore.Interface,
        inNode: namedTypes.Node,
    ): Promise<any>
    {
        if(!iface.module) {
            throw new Error('need module');
        }
        return j(inNode).find(namedTypes.TSPropertySignature).nodes().map((n: namedTypes.TSPropertySignature) => () => {
            if(n.key.type !== 'Identifier') {
                throw new Error(`unsupported key type ${n.key.type}`);
            }
            const propName = n.key.name;
            console.log(`name is ${n.key.name}`);
            const propertyRepo = connection.getRepository(EntityCore.InterfaceProperty);
            const tsTypeRepo = connection.getRepository(EntityCore.TSType);

            ((): Promise<any> => {
                if(n.typeAnnotation !== undefined) {
                    // @ts-ignore
                    const astNode: any = copyTree(n.typeAnnotation.typeAnnotation).toJS();
                    console.log(`looking for type ${JSON.stringify(astNode)}`);
                    return tsTypeRepo.find({module: iface.module,astNode}).then((types: EntityCore.TSType[]) => {
                        if(types.length === 0) {
                            const t = new EntityCore.TSType();
                            if(n.typeAnnotation) {
                                t.tsNodeType = n.typeAnnotation.typeAnnotation.type;
                                t.astNode = copyTree(n.typeAnnotation.typeAnnotation).toJS();
                            }
                            t.module = iface.module;
                            return tsTypeRepo.save(t);
                        } else {
                            console.log(`returning existing type ${types[0].astNode}`);
                            return types[0];
                        }
                    });
                } else {
                    return Promise.resolve(undefined);
                }
            })().then((type: EntityCore.TSType|undefined) => {
                if (type) {
                    if (n.typeAnnotation) {
                        const t1 = n.typeAnnotation.typeAnnotation;
                        console.log(`t1.type is ${t1.type}`);
                        if (t1.type === 'TSTypeReference') {
                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                            const ref = new EntityCore.TSTypeReference(type.id!);
                            console.log(`typeref type is ${t1.typeName.type}`);
                            const nameRepo = connection.getRepository(EntityCore.Name);
                            if(t1.typeName.type !== 'Identifier') {
                                throw new Error(t1.typeName.type);
                            }
                            const name = t1.typeName.name;
                            return nameRepo.find({
                                module: iface.module,
                                name: name
                            }).then(names => {
                                if (names.length === 0) {
                                    const name_ = new EntityCore.Name()
                                    name_.name = name;
                                    name_.module = iface.module;
                                    return nameRepo.save(name_);
                                } else {
                                    return names[0];
                                }
                            }).then(name__ => {
                                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                const ref = new EntityCore.TSTypeReference(type.id!);
                                ref.typeName = name__;
                                return connection.manager.save(ref);
                            });

                        } else if (t1.type === 'TSUnionType') {
                            return this.handleTSUnionType(type, t1, tsTypeRepo, iface, connection);
                        }
                    }
                }

            }).then((): Promise<any> => {
                // @ts-ignore
                return propertyRepo.find({iface, property: { name: propName }}
                ).then((props: EntityCore.InterfaceProperty[]): Promise<any> => {
                    console.log(props.length);
                    if(props.length === 0) {
                        const p = new EntityCore.InterfaceProperty();
                        p.iface = iface;
                        p.property = new EntityCore.Property();
                        //p.property.type = type;
                        p.property.name = propName;
                        p.property.computed = n.computed;
                        p.property.readonly = n.readonly;
                        p.property.optional = n.optional;
                        p.property.hasInitializer = n.initializer != null;
                        p.property.astNode = copyTree(n).toJS();
                        return propertyRepo.save(p);
                    } else {
                        return Promise.resolve(props[0]);
                    }

                });
            });
        }).reduce((a: Promise<void>, v: () => Promise<void>): Promise<void> => a.then(() => v()), Promise.resolve(undefined));
    }

    private static handleTSUnionType(type: EntityCore.TSType,
        t1: namedTypes.TSUnionType,
        tsTypeRepo: Repository<EntityCore.TSType>,
        iface: EntityCore.Interface,
        connection: Connection): Promise<any> {
        console.log('union type');
        if (!type.id) {
            throw new Error('need id');
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const union = new EntityCore.TSUnionType(type.id!);
        return (t1.types.map((unionNode: namedTypes.TSType) => {
            return () => tsTypeRepo.find({
                where: {
                    astNode: copyTree(unionNode).toJS(),
                    module: iface.module
                }
            }).then(ts => {
                console.log(`got ${ts.length} types`);
                if (ts.length === 0) {
                    const newType = new EntityCore.TSType();
                    newType.tsNodeType = unionNode.type;
                    newType.astNode = copyTree(unionNode).toJS();
                    newType.module = iface.module;
                    return tsTypeRepo.save(newType);
                } else {
                    return ts[0];
                }
            });
            // @ts-ignore
        })).reduce((a, v) => a.then(r => v().then(cr => [...r, cr])), Promise.resolve([])).then(results => {
            console.log('saving union type');
            console.log(results);
            union.types = results;

            console.log(union);
            return connection.getRepository(EntityCore.TSUnionType).save(union).then(union_ => {
                console.log(union_);
            }).catch((error: Error): void => {
                console.log('unable to save union type ' + error.message);
            });
        });//.reduce((a: Promise<void>, v: () => Promise<void>): Promise<void> => a.then(() => v()), Promise.resolve(undefined));
    }
}

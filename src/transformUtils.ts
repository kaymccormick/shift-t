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
import { Connection } from "typeorm";
import { visit } from "ast-types";
import {PatternKind} from "ast-types/gen/kinds";
import File = namedTypes.File;
export function getModuleSpecifier(path: string): ModuleSpecifier  {
    return path;
}

export class TransformUtils {

    public static processInterfaceDeclarations(
        connection: Connection,
        module: EntityCore.Module,
        file: File,
    ): Promise<any> {
        return j(file).find(namedTypes.TSInterfaceDeclaration).nodes().map((iDecl: namedTypes.TSInterfaceDeclaration): Promise<void> => {
            if(!iDecl.id) {
                throw new Error('no interface name');
            }
            if(iDecl.id.type !== 'Identifier') {
            throw new Error(`unsupported declaration type ${iDecl.id.type}`);
            }
            const idName = iDecl.id.name;

            const interfaceRepo = connection.getRepository(EntityCore.Interface);
            const nameRepo = connection.getRepository(EntityCore.Name);
            return nameRepo.find({module, name: idName}).then((names) => {
                if(names.length === 0) {
                    const name = new EntityCore.Name();
                    name.name = idName;
                    name.nameKind = 'interface';
                    name.module = module;
                    return nameRepo.save(name).then(() => undefined);
                }
            }).then(() => interfaceRepo.find({module, name: idName}).then(interfaces => {
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
                process.stdout.write('IFACE '+ interface_.name + '\n');
                return j(iDecl).find(namedTypes.TSMethodSignature).nodes().map((node: namedTypes.TSMethodSignature) => {
                    return TransformUtils.processInterfaceMethod(connection, interface_, node)
                });
            }))
        })
            .reduce((a: Promise<void>, v: Promise<void>): Promise<void> => a.then(() => v), Promise.resolve(undefined)).then(() => undefined);
    }

    public static processClassDeclarations(
        connection: Connection,
        module: EntityCore.Module,
        file: File,
    ): Promise<any> {
        return j(file).find(namedTypes.ClassDeclaration).nodes().map((classDecl: namedTypes.ClassDeclaration): Promise<void> => {
            if(!classDecl.id) {
                throw new Error('no class name');
            }
            const classIdName = classDecl.id.name;

            const classRepo = connection.getRepository(EntityCore.Class);
            const nameRepo = connection.getRepository(EntityCore.Name);
            const m = copyTree(classDecl).remove('body');
            const superClass = m.get('superClass');
/*            if(classDecl.implements && classDecl.implements.length)
            if(classDecl.implements[0].type === 'ClassImplements') {
              classDecl.implements.map(imp => {
              
            } else if(classDecl.implements[0].type === 'TSExpressionWithTypeArguments') {
            throw new Error('unsupported');
            }
            Promise.all(classDecl.implements.map(*/
            
            if(superClass) {
//                console.log(superClass.toJS());
            }
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
                process.stdout.write('CLASS '+ class_.name + '\n');
                return j(classDecl).find(namedTypes.ClassMethod).nodes().map((node: namedTypes.ClassMethod) => {
                    return TransformUtils.processClassMethod(connection, class_, node)
                });
            }))
        })
            .reduce((a: Promise<void>, v: Promise<void>): Promise<void> => a.then(() => v), Promise.resolve(undefined)).then(() => undefined);
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

            .nodes().map((importDecl: namedTypes.ImportDeclaration): Promise<void> => {
                const importModule = importDecl.source.value != null &&
            path.resolve(path.dirname(relativeBase), importDecl.source.value.toString()) || '';
                const promises: Promise<void>[] = [];
                visit(importDecl, {
                    visitImportNamespaceSpecifier(path: NodePath<namedTypes.ImportNamespaceSpecifier>): boolean {
                        const node = path.node;
                        if(!node.local) {
                            throw new Error('!node.local');
                        }
                        promises.push(callback(importContext, importModule, node.local.name, undefined, false, true).catch((error: Error): void => {
                            console.log(error.message);
                        }));
                        return false;
                    },
                    visitImportSpecifier(path: NodePath<namedTypes.ImportSpecifier>): boolean {
                        const node = path.node;
                        strictEqual(node.imported.type, 'Identifier');
                        if(!node.local) {
                            throw new Error('!node.local');
                        }
                        promises.push(callback(importContext, importModule, node.local.name, node.imported.name, false, false).catch((error: Error): void => {
                            console.log(error.message);
                        }));
                        return false;
                    },
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    visitImportDefaultSpecifier(path: NodePath<namedTypes.ImportDefaultSpecifier>): boolean {
                        if(!path.node.local) {
                            throw new Error('undefined localName');
                        }
                        promises.push(callback(importContext, importModule, path.node.local.name, undefined, true, false));
                        return false;
                    }
                });
                return Promise.all(promises).then((): void => undefined).catch((error: Error): void => {
                    console.log(error.message);
                });

            })
    }

    public static processExportNamedDeclarations(
        connection: Connection,
        module: EntityCore.Module,
        file: File
    ): Promise<void> {
        return ((): Promise<void>[] => {
            return j(file).find(namedTypes.ExportNamedDeclaration,
                (n: namedTypes.ExportNamedDeclaration): boolean => true
            /*                (n.source && n.declaration
        && (!n.specifiers || n.specifiers.length === 0) || false)*/
            ).nodes().flatMap(
                (node: namedTypes.ExportNamedDeclaration): Promise<void|any>|Promise<void|any>[] => {
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
                            return node.specifiers.map((specifier): Promise<void> => {
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
                            });
                        }
                    }
                    return Promise.resolve(undefined);
                });
        })().reduce((a: Promise<void>, v: Promise<void>): Promise<void> => a.then(() => v), Promise.resolve(undefined)).then(() => undefined);
    }


    public static processExportDefaultDeclaration(        connection: Connection,
        module: EntityCore.Module,
        file: File): Promise<void> {
        return (() => {
            return j(file).find(namedTypes.ExportDefaultDeclaration).nodes().map((n: namedTypes.ExportDefaultDeclaration): Promise<void> => {
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
                    console.log('object expression');//copyTree(n.declaration).toJSON());
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
            })})().reduce((a: Promise<void>, v: Promise<void>): Promise<void> => a.then(() => v), Promise.resolve(undefined)).then(() => undefined);
    }
    public static processClassMethod(connection: Connection, moduleClass: EntityCore.Class, childNode: namedTypes.ClassMethod): Promise<void> {
        const methodDef = childNode;
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
                        let type_ = undefined;
                        if (pk.type === 'Identifier')  {
                            name = pk.name;
                            if (pk.typeAnnotation) {

                                //                            type_ = new Type(pk.typeAnnotation.typeAnnotation.type, pk.typeAnnotation.typeAnnotation);
                                //                            const tree = copyTree(pk.typeAnnotation.typeAnnotation);
                                //                            type_.tree = tree;
                                //
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

    public static processNames(connection: Connection, module: EntityCore.Module, nodeElement: any) {
        return Promise.resolve(undefined);
    }
}

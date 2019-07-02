/**
 * Collection of handy but oddly specific routines
 */
import path from 'path';
import j from 'jscodeshift';
import {strictEqual} from 'assert';
import {namedTypes} from "ast-types/gen/namedTypes";
import {File} from "ast-types/gen/nodes";
import {NodePath} from "ast-types/lib/node-path";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { getFieldNames, getFieldValue } from "ast-types";
import { Collection } from "jscodeshift/src/Collection";
import {EntityCore} from "classModel";
import {copyTree} from "./utils";
import {HandleImportSpecifier, ImportContext, ModuleSpecifier} from './types';
import { Connection } from "typeorm";
import { visit } from "ast-types";
import {PatternKind} from "ast-types/gen/kinds";
export function getModuleSpecifier(path: string): ModuleSpecifier  {
    return path;
}

export class TransformUtils {

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
            const m = copyTree(classDecl);

	    return classRepo.find({module, name: classIdName}).then(classes => {
	    if(!classes.length) {
                    /* create new class instance */
                    const class_ = new EntityCore.Class(module, classIdName, [], []);
                    class_.astNode = m;
                    class_.superClassNode = m.get('superClass');
 	     return classRepo.save(class_);
	    } else {
                    /* should check and update, no? */
	    return Promise.resolve(classes[0]);
	    }
            }).then(class_ => {
            })}).reduce((a: Promise<void>, v: Promise<void>): Promise<void> => a.then(() => v), Promise.resolve(undefined)).then(() => undefined);
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            // @ts-ignore
            .nodes().map((importDecl: namedTypes.ImportDeclaration): Promise<void> => {
                console.log('here');
	    const importModule = importDecl.source.value != null &&
            path.resolve(path.dirname(relativeBase), importDecl.source.value.toString()) || '';
	    const promises: Promise<void>[] = [];
                visit(importDecl, {
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
        return j(file).find(namedTypes.ExportNamedDeclaration,
            (n: namedTypes.ExportNamedDeclaration): boolean => true
            /*                (n.source && n.declaration
	&& (!n.specifiers || n.specifiers.length === 0) || false)*/
        ).nodes().map(
            (node: namedTypes.ExportNamedDeclaration): Promise<void> => {
                const exportRepo = connection.getRepository(EntityCore.Export);
                if(node.declaration) {
                    if (node.declaration.type === 'ClassDeclaration') {
                        const exportName = node.declaration.id ? node.declaration.id.name : undefined;
                        if(exportName === undefined) {
                            throw new Error('no name');
                        }
                        return exportRepo.find({module, name: exportName}).then(exports => {
                            if(exports.length === 0) {
                                const export_ = new EntityCore.Export( exportName, exportName, module);
		    return exportRepo.save(export_).then((export_) => undefined);
                            }
                            return Promise.resolve(undefined);
                        });
                    }
                    else {
                        throw new Error(`unhandled`);
                    }
                } else {
                    if(node.specifiers && node.specifiers.length) {
                        return node.specifiers.map((specifier) => {
                            exportRepo.find({module, exportedName: specifier.exported.name}).then(exports => {
                                if(exports.length === 0) {
                                    const export_ = new EntityCore.Export( specifier.local.name, specifier.exported.name, module);
                                    return exportRepo.save(export_).then((export__) => undefined);
                                }else{
                                    return Promise.resolve(undefined);
                                }
                            });
                        });
                    }
                }
		    }).reduce((a: Promise<void>, v: Promise<void>): Promise<void> => a.then(() => v), Promise.resolve(undefined)).then(() => undefined);
        return Promise.resolve(undefined);
    }


    /*    public static processExportDefaultDeclaration(builders, file, newExports): Promise<void> {

        return j(file).find(namedTypes.ExportDefaultDeclaration).nodes().map((n: namedTypes.ExportDefaultDeclaration): Promise<void> => {
            let name;
            if (n.declaration.type === 'ClassDeclaration') {
	    if(!n.declaration.id) {
	    throw new Error('');
	    }
                name = n.declaration.id.name;
                const export_ = builders.exportNamedDeclaration(null,
                    [builders.exportSpecifier(builders.identifier(name), builders.identifier(name))]);
                newExports.push(export_);
                //thisModule.addExport({ exportName: undefined, localName: name, isDefaultExport: true});
            } else {

                //name = n.declaration.name;
                //thisModule.addExport({ exportName: undefined, localName: name, isDefaultExport: true});
            }
            //thisModule.defaultExport = name;
	    return Promise.resolve(undefined);
        }).reduce((a: Promise<void>, v: Promise<void>): Promise<void> => a.then(() => v), Promise.resolve(undefined)).then(() => undefined);
    }
*/
    public static processClassMethod(connection: Connection, moduleClass: EntityCore.Class, childNode: namedTypes.Declaration): void {
        const methodDef = childNode as namedTypes.ClassMethod;
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
	    methodRepo.find({"classProperty": moduleClass, "name": methodName}).then(methods => {
	    if(methods.length == 0) {
	    return methodRepo.save(new EntityCore.Method(methodName, [], moduleClass));
	    } else {
	    return methods[0];
	    }
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
            })
        }
    }

}

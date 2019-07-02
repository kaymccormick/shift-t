/**
 * Collection of handy but oddly specific routines
 */
import path from 'path';
import {strictEqual} from 'assert';
import {namedTypes} from "ast-types/gen/namedTypes";
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
        collection: Collection<namedTypes.Node>
    ): Promise<any> {
        return collection.find(namedTypes.ClassDeclaration).nodes().map((classDecl: namedTypes.ClassDeclaration): Promise<void> => {
            if(!classDecl.id) {
                throw new Error('no class name');
            }
            const classIdName = classDecl.id.name;
	    console.log(`class is ${classIdName}`);

	    const classRepo = connection.getRepository(EntityCore.Class);

	    return classRepo.find({module, name: classIdName}).then(classes => {
	    if(!classes.length) {
	    return classRepo.save(new EntityCore.Class(module, classIdName, [], []));
	    } else {
	    return classes[0];
	    }
	    })/*.then(class_ => {
            //here is the class?

	    })*/;
	    });
	    /*
            const super_ = classDecl.superClass;
            if (super_) {
                let superSpec: Reference|undefined;
                superSpec = thisModule.getReference1(super_);
                theClass.superSpec = superSpec;

                thisModule.classes = thisModule.classes.set(theClass.name, theClass);
                registry.modules = registry.modules.set(thisModule.name, thisModule);
            }
*/
        /*
            classDecl.body.body.forEach((childNode: namedTypes.Declaration): void => {
                if(childNode.type === 'ClassMethod') {
                    //                    this.processClassMethod(theClass, childNode);

                }
		})


	    return classRepo.save(class_);
	    });
	    */
            .reduce((a: Promise<void>, v: Promise<void>): Promise<void> => a.then(() => v), Promise.resolve(undefined)).then(() => undefined);
    }

    public static handleImportDeclarations1(
        collection: Collection<namedTypes.Node>,
        relativeBase: string,
        importContext: ImportContext,
        callback: HandleImportSpecifier,

    ): Promise<void> {
    // @ts-ignore
        return
        collection.find(namedTypes.ImportDeclaration,
            (n: namedTypes.ImportDeclaration): boolean => {
	    const r: boolean = /*n.importKind === 'value'
            && */n.source && n.source.type === 'StringLiteral'
            && n.source.value != null && /^\.\.?\//.test(n.source.value);
                    //	    console.log(r);
	    return r;
	    })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            // @ts-ignore
            .nodes().map((importDecl: namedTypes.ImportDeclaration): Promise<void> => {
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
		    console.log(`here 5 ${error}`);
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
	    console.log(error);
	    });

            })
    }

    public static handleImportDeclarations( collection: Collection<namedTypes.Node>, maxImport: number, relativeBase: string): Promise<void> {
        return collection.find(namedTypes.ImportDeclaration).nodes().map((n: namedTypes.ImportDeclaration): Promise<void> => {
            strictEqual(n.importKind, 'value');
            strictEqual(n.source.type, 'StringLiteral');
            const source = n.source.value;
            if (source == null) {
                throw new Error('source undefined or null');
            }
            // make sure is relative
            if (!/^\.\.?\//.test(source.toString())) {
                return Promise.resolve(undefined);
            }
            //const importModule = path.resolve(relativeBase, source.toString());
            if (n.specifiers !== undefined) {
            // @ts-ignore
                n.specifiers.forEach((kind): void => {
                //console.log(kind);
                    if (kind.type === 'ImportSpecifier') {
                        strictEqual(kind.imported.type, 'Identifier');
                    //imported[kind.imported.name] = [full, false];
                    } else if (kind.type === 'ImportDefaultSpecifier') {
                        const local = kind.local;
                        if (!local) {
                            throw new Error('kind..local is null');
                        }

                    //console.log(`adding default import ${local.name}`);
                    //km1 thisModule.addImport(local.name, importModule, true, false);
                    //imported[local.name] = [full, true];
                    } else if (kind.type === 'ImportNamespaceSpecifier') {
                        if (kind.local) {
                        //km1 thisModule.addImport(kind.local.name, importModule, false, true);
                        }
                    }
                });
            }
            return Promise.resolve(undefined);

        }).reduce((a: Promise<void>, v: Promise<void>): Promise<void> => a.then(() => v), Promise.resolve(undefined)).then(() => undefined);
    }

    public static processExportNamedDeclarations(
    	   connection: Connection,
	   module: EntityCore.Module,
	   collection: Collection<namedTypes.Node>
	   ): Promise<void> {/*
        return collection.find(namedTypes.ExportNamedDeclaration,
            (n: namedTypes.ExportNamedDeclaration): boolean =>
                (n.source && n.declaration
	&& (!n.specifiers || n.specifiers.length === 0) || false))
            .nodes().map(
                (node: namedTypes.ExportNamedDeclaration): Promise<void> => {
                    if(!node.declaration) {
                        throw new Error('');
                    }
                    if (node.declaration.type === 'ClassDeclaration') {
                        if (!node.declaration.id) {
                            throw new Error(node.declaration.type);
                        }

		    const exportRepo = connection.getRepository(EntityCore.Export);
		    const export_ = new EntityCore.Export( node.declaration.id.name,
		    node.declaration.id.name, module);
		    return exportRepo.save(export_).then((export_) => undefined);
}
return Promise.resolve(undefined);
		    }
		    }).reduce((a: Promise<void>, v: Promise<void>): Promise<void> => a.then(() => v), Promise.resolve(undefined)).then(() => undefined);
   */
        return Promise.resolve(undefined);
    }


    // @ts-ignore
    public static processExportDefaultDeclaration(builders, collection, newExports): Promise<void> {

        return collection.find(namedTypes.ExportDefaultDeclaration).nodes().map((n: namedTypes.ExportDefaultDeclaration): Promise<void> => {
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
	    console.log(n.declaration.type);

                //name = n.declaration.name;
                //thisModule.addExport({ exportName: undefined, localName: name, isDefaultExport: true});
            }
            //thisModule.defaultExport = name;
	    return Promise.resolve(undefined);
        }).reduce((a: Promise<void>, v: Promise<void>): Promise<void> => a.then(() => v), Promise.resolve(undefined)).then(() => undefined);
    }

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

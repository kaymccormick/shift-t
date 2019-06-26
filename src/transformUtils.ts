/**
 * Collection of handy but oddly specific routines
 */
import * as path from 'path';
import {strictEqual,ok} from 'assert';
import {Module} from "classModel";
import {namedTypes} from "ast-types/gen/namedTypes";
import {NodePath} from "ast-types/lib/node-path";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { getFieldNames, getFieldValue } from "ast-types";
import { Collection } from "jscodeshift/src/Collection";
import {ModuleClass} from "classModel/lib/src/ModuleClass";
import {Registry} from "classModel";
import {Reference} from "classModel";
import {Type} from "classModel";
import {copyTree} from "./utils";
import {HandleImportSpecifier, ImportContext, ModuleSpecifier} from './types';

import { visit } from "ast-types";
import {PatternKind} from "ast-types/gen/kinds";
export function getModuleSpecifier(path: string): ModuleSpecifier  {
    return path;
}
export function handleImportDeclarations1(
    collection: Collection<namedTypes.Node>,
    relativeBase: string,
    importContext: ImportContext,
    callback: HandleImportSpecifier,

): Promise<void> {
    // @ts-ignore
    Promises.all(...
    collection.find(namedTypes.ImportDeclaration,
        (n: namedTypes.ImportDeclaration): boolean => {
            console.log(n);
	    const r: boolean = /*n.importKind === 'value'
            && */n.source && n.source.type === 'StringLiteral'
            && n.source.value != null && /^\.\.?\//.test(n.source.value);
            //	    console.log(r);
	    return r;
	    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // @ts-ignore
        .nodes().map((importDecl: namedTypes.ImportDeclaration): Promise<void> => {
            console.log('here');
	    const importModule = importDecl.source.value != null &&
            path.resolve(relativeBase, importDecl.source.value.toString()) || '';
	    const promises: Promise<void>[] = [];
            visit(importDecl, {
                visitImportSpecifier(path: NodePath<namedTypes.ImportSpecifier>): boolean {
                    const node = path.node;
                    strictEqual(node.imported.type, 'Identifier');
		    promises.push(callback(importContext, importModule, node.local!.name, node.imported.name, false, false).catch((error: Error): void => {
		    console.log(error);
		    }));
		    return false;
                },
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                visitImportDefaultSpecifier(path: NodePath<namedTypes.ImportDefaultSpecifier>): boolean {
                    return false;
                }
            });
	    return Promises.all(...promises);
        }));
}

export function handleImportDeclarations( collection: Collection<namedTypes.Node>, maxImport: number, relativeBase: string, thisModule: Module): void {
    const c = collection.find(namedTypes.ImportDeclaration);
    c.forEach((p): void => {
        const n = p.value;
        strictEqual(n.importKind, 'value');
        strictEqual(n.source.type, 'StringLiteral');
        const source = n.source.value;
        if (source == null) {
            throw new Error('source undefined or null');
        }
        // make sure is relative
        if (!/^\.\.?\//.test(source.toString())) {
            return;
        }
        const importModule = path.resolve(relativeBase, source.toString());
        if (n.specifiers !== undefined) {
            // @ts-ignore
            n.specifiers.forEach((kind): void => {
                //console.log(kind);
                if (kind.type === 'ImportSpecifier') {
                    strictEqual(kind.imported.type, 'Identifier');
                    //km1 thisModule.addImport(kind.imported.name, importModule, undefined, undefined);
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

    });
    //return imported;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ExportNamedDeclarationsResult {

}

export function processExportNamedDeclarations(collection: Collection<namedTypes.Node>,
    thisModule: Module):
    ExportNamedDeclarationsResult {
    const named = collection.find(namedTypes.ExportNamedDeclaration);
    const allSpecs = [];
    named.forEach((p: NodePath<namedTypes.Node>): void => {
        const n = p.value;
        if(n.source) {
            return;
            //throw new Error('unable to handle export from source');
        }
        if (n.declaration) {
            if(n.specifiers && n.specifiers.length > 0) {
                throw new Error('woah');
            }
            if (n.declaration.type === 'ClassDeclaration') {
                if (!n.declaration.id) {
                    throw new Error(n.declaration.type);
                }
                thisModule.addExport({ localName: n.declaration.id.name,
                    exportName: n.declaration.id.name});

                //thisModule.exported[n.declaration.id.name] = new Export(n.declaration.id.name);
                //;report(n.declaration.id.name);
            } else if (n.declaration.type === 'VariableDeclaration') {
            } else { // functiondeclaration and tsfunctiondeclaration
            }
        } else {
            if(n.specifiers) {
                allSpecs.push(n.specifiers);
                n.specifiers.forEach((sp1: namedTypes.Specifier): void => {
                    if(sp1.type !== 'ExportSpecifier') {
                        throw new Error('expecting ExportSpecifier');
                    }
                    const sp = sp1 as namedTypes.ExportSpecifier;
                    if(sp.local) {
                        const local = sp.local.name;
                        const exported = sp.exported.name;
                        thisModule.addExport({
                            localName: local,
                            exportName: exported
                        });
                    }
                    //thisModule.exported[exported] = new Export(local, p);
                });
            }
        }
    });
    return {};
}

// @ts-ignore
export function processExportDefaultDeclaration(builders, collection, newExports, thisModule: Module): void {

    // @ts-ignore
    collection.find(namedTypes.ExportDefaultDeclaration).forEach((p): void => {
        const n = p.value;
        let name;
        if (n.declaration.type === 'ClassDeclaration') {
            name = n.declaration.id.name;
            const export_ = builders.exportNamedDeclaration(null,
                [builders.exportSpecifier(builders.identifier(name), builders.identifier(name))]);
            newExports.push(export_);
            thisModule.addExport({ exportName: undefined, localName: name, isDefaultExport: true});
        } else {
            name = n.declaration.name;
            thisModule.addExport({ exportName: undefined, localName: name, isDefaultExport: true});
        }
        thisModule.defaultExport = name;
    });
}


// @ts-ignore
export function shiftExports(namedTypes, builders, collection, newExports, thisModule): void {

    // @ts-ignore
    collection.find(namedTypes.ExportDefaultDeclaration).forEach((p): void => {
        const n = p.value;
        let name;
        if (n.declaration.type === 'ClassDeclaration') {
            name = n.declaration.id.name;
            const export_ = builders.exportNamedDeclaration(null, [builders.exportSpecifier(builders.identifier(name), builders.identifier(name))]);
            newExports.push(export_);
        } else {
            name = n.declaration.name;
        }
        thisModule.defaultExport = name;
    });
}

function processClassMethod(moduleClass: ModuleClass, childNode: namedTypes.Declaration): void {
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
        const method = moduleClass.getMethod(methodName, true);
        ok(methodName);
        const params = methodDef.params;
        params.forEach(
            (pk: PatternKind): void => {
                let name = '';
                let type_: Type|undefined = undefined;
                if (pk.type === 'Identifier')  {
                    name = pk.name;
                    if (pk.typeAnnotation) {

                        type_ = new Type(pk.typeAnnotation.typeAnnotation.type, pk.typeAnnotation.typeAnnotation);
                        const tree = copyTree(pk.typeAnnotation.typeAnnotation);
                        type_.tree = tree;
                        //console.log(tree.toJSON());
                    }
                } else if (pk.type === 'AssignmentPattern') {
                    name = pk.left.type === 'Identifier' ? pk.left.name : pk.left.type;
                } else if (pk.type === 'RestElement') {
                } else {
                    throw new Error(pk.type);
                }
                method.addParam(name, type_);
                moduleClass.methods = moduleClass.methods.set(name, method);
            });

    }
}

export function processClassDeclarations(collection: Collection<namedTypes.Node>, registry: Registry, thisModule: Module): void {

    collection.find(namedTypes.InterfaceDeclaration).forEach((p: NodePath): void => {
        const iface = p.value as namedTypes.InterfaceDeclaration;
        iface.body.properties.forEach((v: namedTypes.ObjectTypeProperty|namedTypes.ObjectTypeSpreadProperty): void => {
            if(v.type === 'ObjectTypeProperty') {
                //                console.log(v);
            }
        })
        thisModule.addInterface(iface.id.name);
    })



    collection.find(namedTypes.ClassDeclaration).forEach((p: NodePath): void => {
        const classDecl = p.value;
        const classIdName = classDecl.id.name;
        const theClass = thisModule.getClass(classIdName, true);
        ok(theClass !== undefined);
        const super_ = classDecl.superClass;
        if (super_) {
            let superSpec: Reference|undefined;
            superSpec = thisModule.getReference1(super_);
            theClass.superSpec = superSpec;

            thisModule.classes = thisModule.classes.set(theClass.name, theClass);
	    /* outside access to this module?! */
            registry.modules = registry.modules.set(thisModule.name, thisModule);
        }

        classDecl.body.body.forEach((childNode: namedTypes.Declaration): void => {
            //console.log(childNode.type);
            if(childNode.type === 'ClassMethod') {
                processClassMethod(theClass, childNode);

            }
        })

        thisModule.classes = thisModule.classes.set(classIdName, theClass);


    });
}

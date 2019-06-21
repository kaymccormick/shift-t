/**
 * Collection of handy but oddly specific routines
 */
import * as path from 'path';
import * as assert from 'assert';
import {Module} from "./Module";
import {
    IdentifierKind,
    PatternKind,
    StatementKind,
    TSTypeAnnotationKind, TSTypeKind,
    TypeAnnotationKind
} from "ast-types/gen/kinds";
import {namedTypes} from "ast-types/gen/namedTypes";
import * as K from "ast-types/gen/kinds";
import {NodePath} from "ast-types/lib/node-path";
import { Collection } from "jscodeshift/src/Collection";
import {ModuleClass, SuperClassSpecification, SuperClassSpecifier} from "./ModuleClass";
import {Registry} from "./types";
import {Reference} from "./Reference";
export function handleImportDeclarations( collection: Collection<namedTypes.Node>, maxImport: number, relativeBase: string, thisModule: Module): void {
    const c = collection.find(namedTypes.ImportDeclaration);
    c.forEach((p, i) => {
        maxImport = Math.max(maxImport, i);
        const n = p.value;
        assert.strictEqual(n.importKind, 'value');
        assert.strictEqual(n.source.type, 'StringLiteral');
        const source = n.source.value;
        if(source == null) {
            throw new Error('source undefined or null');
        }
        if (/^\.\.?\//.test(source.toString())) {
            const importModule = path.resolve(relativeBase, source.toString());
            if(n.specifiers !== undefined) {
                n.specifiers.forEach(kind => {
                    if (kind.type === 'ImportSpecifier') {
                        assert.strictEqual(kind.imported.type, 'Identifier');
                        thisModule.addImport(kind.imported.name, importModule);
                        //imported[kind.imported.name] = [full, false];
                    } else if (kind.type === 'ImportDefaultSpecifier') {
                        const local = kind.local;
                        if(!local) {
                            throw new Error('kind..local is null');
                        }

                        thisModule.addImport(local.name, importModule, true);
                        //imported[local.name] = [full, true];
                    }
                });
            }
        } else {
            //report(source);
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
    named.forEach((p: NodePath<namedTypes.Node>, i: number) => {
        const n = p.value;
        if(n.source) {
            throw new Error('unable to handle export from source');
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
                n.specifiers.forEach((sp1: namedTypes.Specifier) => {
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
export function processExportDefaultDeclaration(builders, collection, newExports, thisModule): void {

    // @ts-ignore
    collection.find(namedTypes.ExportDefaultDeclaration).forEach((p, i) => {
        const n = p.value;
        let name;
        if (n.declaration.type === 'ClassDeclaration') {
            name = n.declaration.id.name;
            const export_ = builders.exportNamedDeclaration(null,
                [builders.exportSpecifier(builders.identifier(name), builders.identifier(name))]);
            newExports.push(export_);
        } else {
            name = n.declaration.name;
        }
        thisModule.defaultExport = name;
    });
}


// @ts-ignore
export function shiftExports(namedTypes, builders, collection, newExports, thisModule) {

    // @ts-ignore
    collection.find(namedTypes.ExportDefaultDeclaration).forEach((p, i) => {
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
//namedTypes.TSExpressionWithTypeArguments | namedTypes.TSTypeReference | namedTypes.TSAnyKeyword | namedTypes.TSBigIntKeyword | namedTypes.TSBooleanKeyword | namedTypes.TSNeverKeyword | namedTypes.TSNullKeyword | namedTypes.TSNumberKeyword | namedTypes.TSObjectKeyword | namedTypes.TSStringKeyword | namedTypes.TSSymbolKeyword | namedTypes.TSUndefinedKeyword | namedTypes.TSUnknownKeyword | namedTypes.TSVoidKeyword | namedTypes.TSThisType | namedTypes.TSArrayType | namedTypes.TSLiteralType | namedTypes.TSUnionType | namedTypes.TSIntersectionType | namedTypes.TSConditionalType | namedTypes.TSInferType | namedTypes.TSParenthesizedType | namedTypes.TSFunctionType | namedTypes.TSConstructorType | namedTypes.TSMappedType | namedTypes.TSTupleType | namedTypes.TSRestType | namedTypes.TSOptionalType | namedTypes.TSIndexedAccessType | namedTypes.TSTypeOperator | namedTypes.TSTypeQuery | namedTypes.TSImportType | namedTypes.TSTypeLiteral;
//namedTypes.TypeAnnotation | namedTypes.TSTypeAnnotation | namedTypes.TSTypePredicate;

function typeDescription(aType: K.TypeAnnotationKind | K.TSTypeAnnotationKind | K.TSTypeKind ): AType  {
// type TSTypeKind = namedTypes.TSExpressionWithTypeArguments | namedTypes.TSTypeReference | namedTypes.TSAnyKeyword | namedTypes.TSBigIntKeyword | namedTypes.TSBooleanKeyword | namedTypes.TSNeverKeyword | namedTypes.TSNullKeyword | namedTypes.TSNumberKeyword | namedTypes.TSObjectKeyword | namedTypes.TSStringKeyword | namedTypes.TSSymbolKeyword | namedTypes.TSUndefinedKeyword | namedTypes.TSUnknownKeyword | namedTypes.TSVoidKeyword | namedTypes.TSThisType | namedTypes.TSArrayType | namedTypes.TSLiteralType | namedTypes.TSUnionType | namedTypes.TSIntersectionType | namedTypes.TSConditionalType | namedTypes.TSInferType | namedTypes.TSParenthesizedType | namedTypes.TSFunctionType | namedTypes.TSConstructorType | namedTypes.TSMappedType | namedTypes.TSTupleType | namedTypes.TSRestType | namedTypes.TSOptionalType | namedTypes.TSIndexedAccessType | namedTypes.TSTypeOperator | namedTypes.TSTypeQuery | namedTypes.TSImportType | namedTypes.TSTypeLiteral;
    if(aType.type === "TypeAnnotation") {
        throw new Error('hi');
    } else if(aType.type === "TSTypePredicate") {
        return 'predicaste';
    } else if (aType.type === "TSTypeAnnotation") {
        const ann = aType.typeAnnotation; // K.TSTypeKind | K.TSTypeAnnotationKind;
        return 'annotation ' + typeDescription(ann);
    } else if(aType.type === 'TSTypeReference') {
        const typeName = aType.typeName;
        if (typeName.type === 'Identifier') {
            return 'reference ' + typeName.name;
        } else {
            throw new Error(typeName.type);
        }/*
    } else  if (aType.type === "TSTypeReference") {
        if (aType.typeName.type === 'Identifier') {
            return aType.typeName.name || 'x';
        } else {
            throw new Error(aType.typeName.type);
        }
        //console.log('zz ' + aType.typeName.type);
  */  } else if (aType.type === 'TSAnyKeyword') {
        return 'any';
    } else if (aType.type === 'TSArrayType') {
        return typeDescription(aType.elementType) + '[]';

    } else if (aType.type === 'TSTypeLiteral') {
        return aType.members.map(member => member.type).join(' ');
    } else if (aType.type === 'TSNumberKeyword') {
        return 'number';
    } else if (aType.type === 'TSStringKeyword') {
        return 'string';
    } else if (aType.type === 'TSBooleanKeyword') {
        return 'boolean';
    } else if (aType.type === 'TSUnionType') {
        return 'union';
    } else if (aType.type === 'TSParenthesizedType') {
        return 'parenthesized';
    } else if (aType.type === 'TSFunctionType') {
        return 'function'
    } else {
        throw new Error(aType.type);
    }
}


function processClassMethod(moduleClass: ModuleClass, childNode: namedTypes.Declaration) {
    const methodDef = childNode as namedTypes.ClassMethod;
    const kind = methodDef.kind;
    const key = methodDef.key;
    const value = undefined;//methodDef.body;
    //throw new Error(kind);
    if (kind === "method") {
        let methodName = '';
        if (key.type === "Identifier") {
            methodName = key.name;
        } else {
            throw new Error(key.type);
        }
        const method = moduleClass.getMethod(methodName, true);
        assert.ok(methodName);
        const params = methodDef.params;
        console.log(methodName + ' ( ' + params.map((pk: PatternKind, i) => {
            let typeDesc = '';
            let name = '';
            if (pk.type === 'Identifier') {
                if (pk.typeAnnotation) {
                    typeDesc = typeDescription(pk.typeAnnotation);
                    name = pk.name;
                }
            } else if (pk.type === 'AssignmentPattern') {
                name = pk.left.type === 'Identifier' ? pk.left.name : pk.left.type;
            } else if (pk.type === 'RestElement') {
            } else {
                throw new Error(pk.type);
            }
            method.addParam(name, typeDesc);
            return `${name}: ${typeDesc}`;

        }).join(', ') + ')');

    }
}

export function processClassDeclarations(collection: Collection<namedTypes.Node>, registry: Registry, thisModule: Module) {

    collection.find(namedTypes.InterfaceDeclaration).forEach((p: NodePath): void => {
        const iface = p.value as namedTypes.InterfaceDeclaration;
        iface.body.properties.forEach((v: namedTypes.ObjectTypeProperty|namedTypes.ObjectTypeSpreadProperty): void => {
            if(v.type === 'ObjectTypeProperty') {
                console.log(v);
            }
        })
        thisModule.addInterface(iface.id.name);
    })



    collection.find(namedTypes.ClassDeclaration).forEach((p: NodePath) => {
        const classDecl = p.value;
        const classIdName = classDecl.id.name;
        const theClass = thisModule.getClass(classIdName, true);
        assert.ok(theClass !== undefined);
        const super_ = classDecl.superClass;
        let spec;
        let id;
        if (super_) {
            let superSpec: Reference|undefined;
            superSpec = thisModule.getReference1(super_);
            theClass.superSpec = superSpec;

            thisModule.classes = thisModule.classes.set(theClass.name, theClass);
            registry.modules = registry.modules.set(thisModule.name, thisModule);
        }

        classDecl.body.body.forEach((childNode: namedTypes.Declaration) => {
            //console.log(childNode.type);
            if(childNode.type === 'ClassMethod') {
                processClassMethod(theClass, childNode);

            }
        })

        thisModule.classes = thisModule.classes.set(classIdName, theClass);


    });
}

"use strict";
exports.__esModule = true;
/**
 * Collection of handy but oddly specific routines
 */
var path = require("path");
var assert_1 = require("assert");
var namedTypes_1 = require("ast-types/gen/namedTypes");
var classModel_1 = require("classModel");
var utils_1 = require("./utils");
var ast_types_1 = require("ast-types");
function getModuleSpecifier(path) {
    return path;
}
exports.getModuleSpecifier = getModuleSpecifier;
function handleImportDeclarations1(collection, relativeBase, importContext, callback) {
    collection.find(namedTypes_1.namedTypes.ImportDeclaration, function (n) {
        var r = n.source && n.source.type === 'StringLiteral'
            && n.source.value != null && /^\.\.?\//.test(n.source.value);
        //	    console.log(r);
        return r;
    })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .nodes().map(function (importDecl) {
        //console.log('1');
        var importModule = importDecl.source.value != null &&
            path.resolve(relativeBase, importDecl.source.value.toString()) || '';
        ast_types_1.visit(importDecl, {
            visitImportSpecifier: function (path) {
                var node = path.node;
                assert_1.strictEqual(node.imported.type, 'Identifier');
                callback(importContext, importModule, node.local.name, node.imported.name, false, false);
                return false;
            },
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            visitImportDefaultSpecifier: function (path) {
                return false;
            }
        });
    });
    //return imported;
}
exports.handleImportDeclarations1 = handleImportDeclarations1;
function handleImportDeclarations(collection, maxImport, relativeBase, thisModule) {
    var c = collection.find(namedTypes_1.namedTypes.ImportDeclaration);
    c.forEach(function (p) {
        var n = p.value;
        assert_1.strictEqual(n.importKind, 'value');
        assert_1.strictEqual(n.source.type, 'StringLiteral');
        var source = n.source.value;
        if (source == null) {
            throw new Error('source undefined or null');
        }
        // make sure is relative
        if (!/^\.\.?\//.test(source.toString())) {
            return;
        }
        var importModule = path.resolve(relativeBase, source.toString());
        if (n.specifiers !== undefined) {
            n.specifiers.forEach(function (kind) {
                //console.log(kind);
                if (kind.type === 'ImportSpecifier') {
                    assert_1.strictEqual(kind.imported.type, 'Identifier');
                    //km1 thisModule.addImport(kind.imported.name, importModule, undefined, undefined);
                    //imported[kind.imported.name] = [full, false];
                }
                else if (kind.type === 'ImportDefaultSpecifier') {
                    var local = kind.local;
                    if (!local) {
                        throw new Error('kind..local is null');
                    }
                    //console.log(`adding default import ${local.name}`);
                    //km1 thisModule.addImport(local.name, importModule, true, false);
                    //imported[local.name] = [full, true];
                }
                else if (kind.type === 'ImportNamespaceSpecifier') {
                    if (kind.local) {
                        //km1 thisModule.addImport(kind.local.name, importModule, false, true);
                    }
                }
            });
        }
    });
    //return imported;
}
exports.handleImportDeclarations = handleImportDeclarations;
function processExportNamedDeclarations(collection, thisModule) {
    var named = collection.find(namedTypes_1.namedTypes.ExportNamedDeclaration);
    var allSpecs = [];
    named.forEach(function (p) {
        var n = p.value;
        if (n.source) {
            return;
            //throw new Error('unable to handle export from source');
        }
        if (n.declaration) {
            if (n.specifiers && n.specifiers.length > 0) {
                throw new Error('woah');
            }
            if (n.declaration.type === 'ClassDeclaration') {
                if (!n.declaration.id) {
                    throw new Error(n.declaration.type);
                }
                thisModule.addExport({ localName: n.declaration.id.name,
                    exportName: n.declaration.id.name });
                //thisModule.exported[n.declaration.id.name] = new Export(n.declaration.id.name);
                //;report(n.declaration.id.name);
            }
            else if (n.declaration.type === 'VariableDeclaration') {
            }
            else { // functiondeclaration and tsfunctiondeclaration
            }
        }
        else {
            if (n.specifiers) {
                allSpecs.push(n.specifiers);
                n.specifiers.forEach(function (sp1) {
                    if (sp1.type !== 'ExportSpecifier') {
                        throw new Error('expecting ExportSpecifier');
                    }
                    var sp = sp1;
                    if (sp.local) {
                        var local = sp.local.name;
                        var exported = sp.exported.name;
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
exports.processExportNamedDeclarations = processExportNamedDeclarations;
// @ts-ignore
function processExportDefaultDeclaration(builders, collection, newExports, thisModule) {
    // @ts-ignore
    collection.find(namedTypes_1.namedTypes.ExportDefaultDeclaration).forEach(function (p) {
        var n = p.value;
        var name;
        if (n.declaration.type === 'ClassDeclaration') {
            name = n.declaration.id.name;
            var export_ = builders.exportNamedDeclaration(null, [builders.exportSpecifier(builders.identifier(name), builders.identifier(name))]);
            newExports.push(export_);
            thisModule.addExport({ exportName: undefined, localName: name, isDefaultExport: true });
        }
        else {
            name = n.declaration.name;
            thisModule.addExport({ exportName: undefined, localName: name, isDefaultExport: true });
        }
        thisModule.defaultExport = name;
    });
}
exports.processExportDefaultDeclaration = processExportDefaultDeclaration;
// @ts-ignore
function shiftExports(namedTypes, builders, collection, newExports, thisModule) {
    // @ts-ignore
    collection.find(namedTypes.ExportDefaultDeclaration).forEach(function (p) {
        var n = p.value;
        var name;
        if (n.declaration.type === 'ClassDeclaration') {
            name = n.declaration.id.name;
            var export_ = builders.exportNamedDeclaration(null, [builders.exportSpecifier(builders.identifier(name), builders.identifier(name))]);
            newExports.push(export_);
        }
        else {
            name = n.declaration.name;
        }
        thisModule.defaultExport = name;
    });
}
exports.shiftExports = shiftExports;
function processClassMethod(moduleClass, childNode) {
    var methodDef = childNode;
    var kind = methodDef.kind;
    var key = methodDef.key;
    if (kind === "method") {
        var methodName = '';
        if (key.type === "Identifier") {
            methodName = key.name;
        }
        else {
            throw new Error(key.type);
        }
        var method_1 = moduleClass.getMethod(methodName, true);
        assert_1.ok(methodName);
        var params = methodDef.params;
        params.forEach(function (pk) {
            var name = '';
            var type_ = undefined;
            if (pk.type === 'Identifier') {
                name = pk.name;
                if (pk.typeAnnotation) {
                    type_ = new classModel_1.Type(pk.typeAnnotation.typeAnnotation.type, pk.typeAnnotation.typeAnnotation);
                    var tree = utils_1.copyTree(pk.typeAnnotation.typeAnnotation);
                    type_.tree = tree;
                    //console.log(tree.toJSON());
                }
            }
            else if (pk.type === 'AssignmentPattern') {
                name = pk.left.type === 'Identifier' ? pk.left.name : pk.left.type;
            }
            else if (pk.type === 'RestElement') {
            }
            else {
                throw new Error(pk.type);
            }
            method_1.addParam(name, type_);
            moduleClass.methods = moduleClass.methods.set(name, method_1);
        });
    }
}
function processClassDeclarations(collection, registry, thisModule) {
    collection.find(namedTypes_1.namedTypes.InterfaceDeclaration).forEach(function (p) {
        var iface = p.value;
        iface.body.properties.forEach(function (v) {
            if (v.type === 'ObjectTypeProperty') {
                //                console.log(v);
            }
        });
        thisModule.addInterface(iface.id.name);
    });
    collection.find(namedTypes_1.namedTypes.ClassDeclaration).forEach(function (p) {
        var classDecl = p.value;
        var classIdName = classDecl.id.name;
        var theClass = thisModule.getClass(classIdName, true);
        assert_1.ok(theClass !== undefined);
        var super_ = classDecl.superClass;
        if (super_) {
            var superSpec = void 0;
            superSpec = thisModule.getReference1(super_);
            theClass.superSpec = superSpec;
            thisModule.classes = thisModule.classes.set(theClass.name, theClass);
            /* outside access to this module?! */
            registry.modules = registry.modules.set(thisModule.name, thisModule);
        }
        classDecl.body.body.forEach(function (childNode) {
            //console.log(childNode.type);
            if (childNode.type === 'ClassMethod') {
                processClassMethod(theClass, childNode);
            }
        });
        thisModule.classes = thisModule.classes.set(classIdName, theClass);
    });
}
exports.processClassDeclarations = processClassDeclarations;

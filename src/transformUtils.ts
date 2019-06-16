/**
 * Collection of handy but oddly specific routines
 */
import * as path from 'path';
import * as assert from 'assert';
import {Module} from "./Module";
import {Exported} from "./Exported";

export function handleImportDeclarations(namedTypes, collection, maxImport, relativeBase, thisModule: Module): void {
    const imported = {};
    collection.find(namedTypes.ImportDeclaration).forEach((p, i) => {
        maxImport = Math.max(maxImport, i);
        const n = p.value;
        const source = n.source.value;
        if (/^\.\.?\//.test(source)) {
            const full = path.resolve(relativeBase, source);
            assert.strictEqual(n.importKind, 'value');
            n.specifiers.forEach(kind => {
                if (kind.type === 'ImportSpecifier') {
                    assert.strictEqual(kind.imported.type, 'Identifier');
                    imported[kind.imported.name] = [full, false];
                } else if (kind.type === 'ImportDefaultSpecifier') {
                    const local = kind.local;
                    imported[local.name] = [full, true];
                }
            });
        } else {
            //report(source);
        }
    });
    return imported;
}

interface ExportNamedDeclarationsResult {
    allSpecs: {}[][];
}

export function processExportNamedDeclarations(namedTypes, collection, thisModule): ExportNamedDeclarationsResult {
    const named = collection.find(namedTypes.ExportNamedDeclaration);
    const allSpecs = [];
    named.forEach((p, i) => {
        const n = p.value;
        if(n.source) {
            throw new Error('unable to handle export from source');
        }
        if (n.declaration) {
            if(n.specifiers.length > 0) {
                throw new Error('woah');
            }
            if (n.declaration.type === 'ClassDeclaration') {
                if (!n.declaration.id) {
                    throw new Error(n.declaration.type);
                }
                thisModule.exported[n.declaration.id.name] = new Exported(n.declaration.id.name);
                //;report(n.declaration.id.name);
            } else if (n.declaration.type === 'VariableDeclaration') {
            } else { // functiondeclaration and tsfunctiondeclaration
            }
        } else {
            allSpecs.push(n.specifiers);
            n.specifiers.forEach(sp => {
                const local = sp.local.name;
                const exported = sp.exported.name
                thisModule.exported[exported] = new Exported(local, p);
            });
        }
    });
    return { allSpecs }
}

export function processExportDefaultDeclaration(namedTypes, builders, collection, newExports, thisModule) {

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


export function shiftExports(namedTypes, builders, collection, newExports, thisModule) {

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

export function processClassDeclarations(namedTypes, collection, thisModule: Module) {

    collection.find(namedTypes.ClassDeclaration).forEach(p => {
        const n = p.value;
        const classIdName = n.id.name;
        const aClass = thisModule.getClass(classIdName);
        assert.ok(aClass !== undefined);
        const super_ = n.superClass;
        let spec;
        let id;
        if (super_) {
            if (super_.type === 'MemberExpression') {
                const oname = super_.object.name;
                id = oname;
                const pname = super_.property.name;
                spec = [oname, pname];
            } else if (super_.type === 'Identifier') {
                spec = super_.name;
                id = spec;
            }

        }
        // @ts-ignore
        aClass.superSpec = spec;
    });
}


import * as path from 'path';
import * as assert from 'assert';
import {Module} from "./Module";

export function handleImportDeclarations(api, collection, maxImport, relativeBase, thisModule: Module) {
    const j = api.jscodeshift;
    const report = api.report;
    collection.find(j.ImportDeclaration).forEach((p, i) => {
        maxImport = Math.max(maxImport, i);
        const n = p.value;
        const source = n.source.value;
        if (/^\.\.?\//.test(source)) {
            const full = path.resolve(relativeBase, source);
            assert.strictEqual(n.importKind, 'value');
            const x = [];
            n.specifiers.forEach(kind => {
                if (kind.type === 'ImportSpecifier') {
                    assert.strictEqual(kind.imported.type, 'Identifier');
                    thisModule.imported[kind.imported.name] = [full];
                } else if (kind.type === 'ImportDefaultSpecifier') {
                    const local = kind.local;
                    thisModule.imported[local.name] = [full, 'default'];
                }
                x.push(kind.type);
            });
        } else {
            report(source);
        }
    });
}

export function processExportNamedDeclarations(api, collection, newBody, thisModule) {
    const j = api.jscodeshift;
    const report = api.report;
    const named = collection.find(j.ExportNamedDeclaration);
    named.forEach((p, i) => {
        const n = p.value;
        if (n.declaration) {
            assert.strictEqual(n.specifiers.length, 1);
            newBody.splice(i, 1, n.declaration);
            if (n.declaration.type === 'ClassDeclaration') {
                if (!n.declaration.id) {
                    throw new Error(n.declaration.type);
                }
                thisModule.exported[n.declaration.id.name] = n.declaration.id.name;
                report(n.declaration.id.name);
            } else if (n.declaration.type === 'VariableDeclaration') {
            } else { // functiondeclaration and tsfunctiondeclaration


            }
        }
        n.specifiers.forEach(sp => {
            const local = sp.local.name;
            const exported = sp.exported.name;
            report(`e: ${i}:` + exported);
            thisModule.exported[exported] = local;
        });
    });
}

export function processExportDefaultDeclaration(api, collection, newBody, newExports, thisModule) {
    const j = api.jscodeshift;
    collection.find(j.ExportDefaultDeclaration).forEach((p, i) => {
        const n = p.value;
        let name;
        if (n.declaration.type === 'ClassDeclaration') {
            name = n.declaration.id.name;
            //newBody.push(n.declaration);
            newBody.splice(i, 1, n.declaration);
            const export_ = j.exportNamedDeclaration(null, [j.exportSpecifier(j.identifier(name), j.identifier(name))]);
            newExports.push(export_);
        } else {
            name = n.declaration.name;
        }
        thisModule.defaultExport = name;
    });
}

export function processClassDeclarations(api, collection, thisModule: Module) {
    const j = api.jscodeshift;
    collection.find(j.ClassDeclaration).forEach(p => {
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

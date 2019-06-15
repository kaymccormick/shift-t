import {getFieldNames, getFieldValue, eachField} from 'ast-types';

const recast = require('recast');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

module.exports = function (fileInfo, api, options) {
    let sources = JSON.parse(fs.readFileSync('sources_1.json', {encoding: 'utf-8'}));
    if (sources.file === undefined) {
        sources.file = {};
    }
    if(sources.pid !== process.pid) {
        sources = { module: {}, pid: process.pid }
    }
    const report = api.report;
    const j = api.jscodeshift;
    const r = j(fileInfo.source);
    const fullpath = path.resolve(fileInfo.path);
    const moduleName = fullpath.replace(/\.ts$/, '');
    report(moduleName);
    const thisModule = {
        imported: {}, exported: {}, classes: {},
        defaultExport: undefined,
        module: moduleName,
    };
    sources.module[moduleName] = thisModule;
    let maxImport = -1;
    r.find(j.ImportDeclaration).forEach((p, i) => {
        maxImport = Math.max(maxImport, i);
        const n = p.value;
        const source = n.source.value;
        if (/^\.\.?\//.test(source)) {
            const dir = path.dirname(fullpath);
            const full = path.resolve(dir, source);
            assert.strictEqual(n.importKind, 'value');
            const x = [];
            n.specifiers.forEach(kind => {
                if (kind.type === 'ImportSpecifier') {
                    assert.equal(kind.imported.type, 'Identifier');
                    report(kind.imported.name);
                    thisModule.imported[kind.imported.name] = [full];
                } else if (kind.type === 'ImportDefaultSpecifier') {
                    const local = kind.local;
                    report(local.name);
                    //                  eachField(local, (n, v) => report(`${n}: ${v}`));
                    thisModule.imported[local.name] = [full, 'default'];
                }
                x.push(kind.type);
            });
        } else {
            report(source);
        }
    });
    const newBody = [...r.paths()[0].value.program.body];

    const newFile = j.file(j.program(newBody));
    const newExports = [];
    const named = r.find(j.ExportNamedDeclaration);
    named.forEach((p, i) => {
        const n = p.value;
        // const x = [];
        // eachField(n, (k1, v1) => x.push(`${k1} ${v1}`));
        // report(x.join('\n'));
        if (n.declaration) {
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
            const x = [];
            eachField(sp, (k1, v1) => x.push(`${k1} ${v1}`));
            //        report(x.join('\n'));
            const local = sp.local.name;
            const exported = sp.exported.name;
            report(`e: ${i}:` + exported);
            thisModule.exported[exported] = local;
        });
    });
    r.find(j.ExportDefaultDeclaration).forEach((p, i) => {
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
    const ss = thisModule.classes;
    r.find(j.ClassDeclaration).forEach(p => {
        const n = p.value;
        const class_ = {};
        const classIdName = n.id.name;
        ss[classIdName] = class_;
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
        class_.superSpec = spec;
    });
    //r.paths()[0].program.body.splice(maxImport, 0, ...impors)

    newBody.push(...newExports);
    fs.writeFileSync('sources_1.json', JSON.stringify(sources, null, 4), 'utf-8');
    return j(newFile).toSource();
    //return recast.print(newFile).code;
}

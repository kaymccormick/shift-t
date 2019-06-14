import { getFieldNames, getFieldValue, eachField } from 'ast-types';
const recast = require('recast');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

module.exports = function(fileInfo, api, options) {
    const sources = JSON.parse(fs.readFileSync('sources_1.json', { encoding: 'utf-8' }));
    if(sources.file === undefined) {
        sources.file = {};
    }
    const report = api.report;
    const j = api.jscodeshift;
    const superClasses = [];
    const leafClasses = [];
    const r = j(fileInfo.source);
    const fullpath = path.resolve(fileInfo.path);

    const thisFile = { imported: {}, exported: {}, classes: {},
        defaultExport: undefined
    };
    sources.file[fullpath] = thisFile;
    r.find(j.ImportDeclaration).forEach(p => {
        const n = p.value;
        const source = n.source.value;
        if(/^\.\.?\//.test(source)) {
            const dir = path.dirname(fullpath);
            const full = path.resolve(dir, source);
            assert.equal(n.importKind, 'value');
            const x = [];
            n.specifiers.forEach( kind => {
                if(kind.type === 'ImportSpecifier') {
                    assert.equal(kind.imported.type, 'Identifier');
                    report(kind.imported.name);
                    thisFile.imported[kind.imported.name] = [full];
                } else if(kind.type === 'ImportDefaultSpecifier') {
                    const local = kind.local;
                    report(local.name);
                    //                  eachField(local, (n, v) => report(`${n}: ${v}`));
                    thisFile.imported[local.name] = [full, 'default'];
                }
                x.push(kind.type);
            });
        } else {
            report(source);
        }
    });

    r.find(j.ExportDefaultDeclaration).forEach(p => {
        const n = p.value;
        let name;
        if(n.declaration.type === 'ClassDeclaration') {
            name = n.declaration.id.name;
        } else {
            name = n.declaration.name;
        }
        thisFile.defaultExport = name;
    });
    r.find(j.ExportNamedDeclaration).forEach(p => {
        const n = p.value;
        if(n.declaration && n.declaration.type === 'ClassDeclaration') {
            if(!n.declaration.id) {
                throw new Error(n.declaration.type);
            }
            thisFile.exported[n.declaration.id.name] = n.declaration.id.name;
        }
        n.specifiers.forEach(sp => {
            const x= [];
            eachField(sp, (k1, v1) => x.push(`${k1} ${v1}`));
            //        report(x.join('\n'));
            const local = sp.local.name;
            const exported = sp.exported.name;
            thisFile.exported[exported] = local;
        });
    });
    const ss = thisFile.classes;
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


    fs.writeFileSync('sources_1.json', JSON.stringify(sources), 'utf-8');
}

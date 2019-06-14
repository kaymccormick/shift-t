const recast = require('recast');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

import { A } from '../misc';

module.exports = function(fileInfo, api, options) {
    const sources = JSON.parse(fs.readFileSync('sources_1.json', { encoding: 'utf-8' }));
    if(sources.namespace === undefined) {
        sources.namespace = {};
    }
    if(sources.files === undefined) {
        sources.files = {};
    }
    const report = api.report;
    const j = api.jscodeshift;
    const superClasses = [];
    const leafClasses = [];
    const r = j(fileInfo.source);
    const fullpath = path.resolve(fileInfo.path);
    sources.namespace[fullpath] = {};
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
                    sources.namespace[fullpath][kind.imported.name] = [full];
                } else if(kind.type === 'ImportDefaultSpecifier') {
                }
                x.push(kind.type);
            });
            sources.files[full] = { x };
        } else {
            report(source);
        }
    });
    const paths = r.find(j.ClassDeclaration).paths();
    paths.forEach(p => {
        const n = p.value;
        if(n.superClass) {
            if(n.superClass.type === 'MemberExpression') {
                const o = n.superClass.object;
                const p = n.superClass.property;
                assert.equal(p.type, 'Identifier');
                report(`${o.name}.${p.name}`);
            } else {
                assert.equal(n.superClass.type, 'Identifier');
            }
        }
    });

    fs.writeFileSync('sources_1.json', JSON.stringify(sources), 'utf-8');
}

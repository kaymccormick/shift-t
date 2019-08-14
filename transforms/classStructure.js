/**
 * Collect various sorts of class information, opening and rewriting
 * a 'sources_1.json' file each time. This file is intended for further 
 * processing. This is the precursor to the more complete collector which
 * stores information into PostgreSQL using TypeORM.
 * 
 * Before use, you must 'echo {}' > sources_1.json. Lame, I know.
 *
 * This file remains for reference.
 */
const path = require('path');
const fs = require('fs');
const assert = require('assert');

module.exports = function(fileInfo, api, options) {
    const sources = JSON.parse(fs.readFileSync('sources_1.json', { encoding: 'utf-8' }));
    if(sources.namespace === undefined) {
        sources.namespace = {};
    }
    if(sources.files === undefined) {
        sources.files = {};
    }
    const j = api.jscodeshift;
    const r = j(fileInfo.source);
    const fullpath = path.resolve(fileInfo.path);
    sources.namespace[fullpath] = {};
    r.find(j.ImportDeclaration).forEach(p => {
        const n = p.value;
        const source = n.source.value;
        if(/^\.\.?\//.test(source)) {
            const dir = path.dirname(fullpath);
            const full = path.resolve(dir, source);
            assert.strictEqual(n.importKind, 'value');
            const x = [];
            n.specifiers.forEach( kind => {
                if(kind.type === 'ImportSpecifier') {
                    assert.equal(kind.imported.type, 'Identifier');
                    sources.namespace[fullpath][kind.imported.name] = [full];
                } else if(kind.type === 'ImportDefaultSpecifier') {
                }
                x.push(kind.type);
            });
            sources.files[full] = { x };
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
            } else {
                assert.equal(n.superClass.type, 'Identifier');
            }
        }
    });

    fs.writeFileSync('sources_1.json', JSON.stringify(sources), 'utf-8');
}

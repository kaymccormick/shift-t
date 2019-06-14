const recast = require('recast');
const path = require('path');
const fs = require('fs');
const assert = require('assert');
import { Entry } from '../src/Entry';

module.exports = function(fileInfo, api, options) {
    const sources_1 = JSON.parse(fs.readFileSync('sources_1.json', { encoding: 'utf-8' }));
    const sources_2 = JSON.parse(fs.readFileSync('sources_2.json', { encoding: 'utf-8' }));
    const report = api.report;
    const j = api.jscodeshift;
    const superClasses = [];
    const leafClasses = [];
    const r = j(fileInfo.source);
    const fullpath = path.resolve(fileInfo.path);
    const paths = r.find(j.ClassDeclaration).paths();
    const s1 = sources_1.namespace[fullpath];
    sources_2[fullpath] = {};
    const ns = sources_2[fullpath];
    paths.forEach(p => {
        const n = p.value;
        const class_ = {};
        const super_ = n.superClass;
        let spec;
        let id;
        if(super_) {
            if(super_.type === 'MemberExpression') {
                const oname = super_.object.name;
                id = oname;
                const pname = super_.property.name;
                spec = `${oname}.${pname}`;
            } else if(super_.type === 'Identifier') {
                spec = super_.name;
                id = spec;

            }
        }
        if(!(id in s1)) {
            throw new Error(`${fullpath} ${spec} ${id}`);
        }
        class_.superSpec = s1[id];
        ns[n.id.name] = class_;
    });
    fs.writeFileSync('sources_2.json', JSON.stringify(sources_2), 'utf-8');
}

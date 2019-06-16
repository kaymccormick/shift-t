const assert = require('assert');
const fs = require('fs');
const astTypes = require('ast-types');
const recast = require('recast');
const camelcase = require('camelcase');
const { namedTypes, builders, getFieldNames } = require('ast-types');

const b = builders;

module.exports = (fileInfo, api, options) => {
    const {report} = api;
    const j = api.jscodeshift;
    const r = j(fileInfo.source);

    r.find(j.ClassDeclaration, (n) => n.superClass.type === 'Identifier').forEach(n => {
        console.log(n.superClass);
    })
    r.find(j.ClassProperty).paths().forEach(p => {
        if(p.value.accessibility === undefined) {
            p.value.accessibility = 'public';
        }
        //report(p);
    })
r.find(j.ClassMethod).paths().forEach(p => {
    report(p.node.key.name);
    p.node.accessibility = 'public';
})
    return recast.print(r.paths()[0]).code;
}

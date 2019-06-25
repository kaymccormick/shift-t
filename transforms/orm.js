"use strict";
exports.__esModule = true;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
var recast_1 = require("recast");
// eslint-disable-next-line @typescript-eslint/no-unused-vars
var immutable_1 = require("immutable");
module.exports = function (fileInfo, api, options) {
    var ast;
    var j = api.jscodeshift;
    var c;
    if (options['parse-with'] === 'recast') {
        ast = recast_1.parse(fileInfo.source, {
            parser: require("recast/parsers/typescript")
        });
        c = j(ast);
    }
    else {
        c = j(fileInfo.source);
    }
    var m = c.find(j.ImportDeclaration, function (n) {
        return n.source.type === (ast ? 'Literal' : 'StringLiteral')
            && n.source && n.source.value === 'typeorm' && n.specifiers !== undefined;
    });
    var map2 = immutable_1.Map();
    var xx = m.nodes().map(function (n) { return immutable_1.List(n.specifiers || []); });
    if (xx.length) {
        var zz = xx.reduce(function (a, c) { return a.merge(c); });
        console.dir(zz.toJS());
    }
    var map1 = immutable_1.Map();
    /*     let map1: Map<string, string> = Map<string, string>(
              List.of<SpecifierKind>(...m.nodes()
                 .flatMap<SpecifierKind>((n: namedTypes.ImportDeclaration): SpecifierKind[] =>
                    n.specifiers || [] ))
                 .map((specifier: SpecifierKind): [string, string] =>
                     specifier.type === 'ImportSpecifier' &&
                     specifier.imported && specifier.local ? [specifier.imported.name, specifier.local.name] : ['', ''])
    
        const imports = ['Column', 'Entity'];
        imports.forEach((importName): void => {
            if(!map1.has(importName) || map1.get(importName) === undefined) {
                map2 = map2.set(importName, importName);
            }
        });
    */ if (map2.count()) {
        c.nodes()[0].program.body.splice(0, 0, j.importDeclaration(map2.map(function (importedName, importName) { return j.importSpecifier(j.identifier(importedName), j.identifier(importName)); }).valueSeq().toJS(), j.literal('typeorm')));
    }
    map1 = map1.merge(map2);
    c.find(j.ClassDeclaration, function (n) {
        console.log("type " + n.type);
        return !n.decorators || n.decorators.findIndex(function (x) { return x.expression.type === 'CallExpression' && x.expression.callee.type === 'Identifier' && x.expression.callee.name === map1.get('Entity'); }) === -1;
    }).nodes().forEach(function (n) {
        console.log("type " + n.type);
        if (n.decorators) {
            n.decorators.push(j.decorator(j.callExpression(j.identifier(map1.get('Entity')), [])));
        }
        else {
            n.decorators = [j.decorator(j.callExpression(j.identifier(map1.get('Entity')), []))];
        }
    });
    c.find(j.ClassProperty, function (n) { return !n.decorators || n.decorators.findIndex(function (x) { return x.expression.type === 'CallExpression' && x.expression.callee.type === 'Identifier' && x.expression.callee.name === map1.get('Column'); }) === -1; })
        .nodes().forEach(function (n) {
        console.log("type is " + n.type);
        if (n.decorators) {
            n.decorators.push(j.decorator(j.callExpression(j.identifier(map1.get('Column')), [])));
        }
        else {
            n.decorators = [j.decorator(j.callExpression(j.identifier(map1.get('Column')), []))];
        }
    });
    if (ast) {
        return recast_1.print(ast).code;
    }
    else {
        return c.toSource();
    }
    //    return print(ast).code;
};

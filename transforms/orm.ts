import {namedTypes} from "ast-types/gen/namedTypes";
import { parse, print } from 'recast';
import { builders} from 'ast-types';
import {Collection, Map, List} from 'immutable';
import {NodePath} from "ast-types/lib/node-path";
import {SpecifierKind} from "ast-types/gen/kinds";
import { fromNodes } from 'jscodeshift/src/Collection';

// @ts-ignore
module.exports = function (fileInfo, api, options) {
    const report = api.report;
//    const ast = parse(fileInfo.source);
    const j = api.jscodeshift;
    
    const c = j(fileInfo.source);
    const m = c.find(j.ImportDeclaration, (n: namedTypes.ImportDeclaration) => {
    console.log(n);
        return n.source.type === 'StringLiteral'
		&& n.source && n.source.value === 'typeorm'
 		&& n.specifiers });
		let map2: Map<string, string> = Map<string, string>();
    console.log(m.size());
    let map1: Map<string, string> = Map<string, string>(
    	  List.of<SpecifierKind>(...m.nodes()
            .flatMap((n: namedTypes.ImportDeclaration): SpecifierKind[] =>
                n.specifiers ))
            .map((specifier: SpecifierKind): string[] =>
                specifier.type === 'ImportSpecifier' &&
                specifier.imported && specifier.local ? [specifier.imported.name, specifier.local.name] : [])
            .filter(x => x.length));
    console.log('map1: ', map1.toJS());
    
    const imports = ['Column', 'Entity'];
    imports.forEach(importName => {
    if(!map1.has(importName) || map1.get(importName) === undefined) {
       map2 = map2.set(importName, importName);
    }
    });
    if(map2.count()) {
    console.log(map2.toJS());
    c.nodes()[0].program.body.splice(0, 0, j.importDeclaration(map2.map((importedName, importName) => j.importSpecifier(j.identifier(importedName), j.identifier(importName))).valueSeq().toJS(), j.literal('typeorm')));
    }
    map1 = map1.merge(map2);
    console.log(map1.toJS())

/*    c.find(j.ClassDeclaration, (n) => !n.decorators || n.decorators.findIndex(x => x.expression.type === 'CallExpression' && x.expression.callee.type === 'Identifier' && x.expression.callee.name === map1.get('Entity')) === -1).forEach((n: namedTypes.ClassDeclaration) => {
    console.log(n.type);
        if(n.decorators) {
            n.decorators.push(j.decorator(j.callExpression(j.identifier(map1.get('Entity')), [])));
        } else {
            n.decorators = [j.decorator(j.callExpression(j.identifier(map1.get('Entity')), []))];
        }
    });*/
/*    
    c.find(j.ClassProperty).nodes().forEach((n: namedTypes.ClassProperty) => {
        if(n.decorators) {
            n.decorators.push(j.decorator(j.callExpression(j.identifier(map1.get('Column')), [])));
        } else {
            n.decorators = [j.decorator(j.callExpression(j.identifier(map1.get('Column')), []))];
        }
    });
  */
  return c.toSource();
//    return print(ast).code;
}

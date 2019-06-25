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
    let ast;
    const j = api.jscodeshift;
    let c;
    if(options['parse-with'] === 'recast') {
       ast = parse(fileInfo.source, {
  parser: require("recast/parsers/typescript")});
       c = j(ast);
    } else {
      c = j(fileInfo.source);
      }

    const m = c.find(j.ImportDeclaration, (n: namedTypes.ImportDeclaration) => {
        return n.source.type === (ast ? 'Literal' : 'StringLiteral')
		&& n.source && n.source.value === 'typeorm'
 		&& n.specifiers });
<<<<<<< HEAD
		let map2: Map<string, string> = Map<string, string>();
    let map1: Map<string, string> = Map<string, string>(
    	  List.of<SpecifierKind>(...m.nodes()
            .flatMap((n: namedTypes.ImportDeclaration): SpecifierKind[] =>
                n.specifiers ))
            .map((specifier: SpecifierKind): string[] =>
                specifier.type === 'ImportSpecifier' &&
                specifier.imported && specifier.local ? [specifier.imported.name, specifier.local.name] : [])
            .filter(x => x.length));

    const imports = ['Column', 'Entity'];
    imports.forEach(importName => {
    if(!map1.has(importName) || map1.get(importName) === undefined) {
       map2 = map2.set(importName, importName);
    }
    });
    if(map2.count()) {
    c.nodes()[0].program.body.splice(0, 0, j.importDeclaration(map2.map((importedName, importName) => j.importSpecifier(j.identifier(importedName), j.identifier(importName))).valueSeq().toJS(), j.literal('typeorm')));
=======
    let map2: Map<string, string> = Map<string, string>();
    let map1: Map<string, string> = Map<string, string>(
    	  List.of<SpecifierKind>(...m.nodes()
            .flatMap((n: namedTypes.ImportDeclaration): SpecifierKind[] =>
                n.specifiers || [] ))
            .map((specifier: SpecifierKind): [string, string] =>
                specifier.type === 'ImportSpecifier' &&
                specifier.imported && specifier.local ? [specifier.imported.name, specifier.local.name] : ['', ''])
            .filter(x => x[0].length));

    const imports = ['Column', 'Entity'];
    imports.forEach(importName => {
        if(!map1.has(importName) || map1.get(importName) === undefined) {
            map2 = map2.set(importName, importName);
        }
    });
    if(map2.count()) {
        c.nodes()[0].program.body.splice(0, 0, j.importDeclaration(map2.map((importedName, importName) => j.importSpecifier(j.identifier(importedName), j.identifier(importName))).valueSeq().toJS(), j.literal('typeorm')));
>>>>>>> f3275800310b78da9d74837934cfd23039bbd090
    }
    map1 = map1.merge(map2);

    c.find(j.ClassDeclaration, (n) => {
<<<<<<< HEAD
    console.log(`type ${n.type}`);
    return !n.decorators || n.decorators.findIndex(x => x.expression.type === 'CallExpression' && x.expression.callee.type === 'Identifier' && x.expression.callee.name === map1.get('Entity')) === -1;
    }).nodes().forEach((n: namedTypes.ClassDeclaration) => {
    console.log(`type ${n.type}`);
=======
        console.log(`type ${n.type}`);
        return !n.decorators || n.decorators.findIndex(x => x.expression.type === 'CallExpression' && x.expression.callee.type === 'Identifier' && x.expression.callee.name === map1.get('Entity')) === -1;
    }).nodes().forEach((n: namedTypes.ClassDeclaration) => {
        console.log(`type ${n.type}`);
>>>>>>> f3275800310b78da9d74837934cfd23039bbd090
        if(n.decorators) {
            n.decorators.push(j.decorator(j.callExpression(j.identifier(map1.get('Entity')), [])));
        } else {
            n.decorators = [j.decorator(j.callExpression(j.identifier(map1.get('Entity')), []))];
        }
<<<<<<< HEAD
    });

    c.find(j.ClassProperty, (n) => !n.decorators || n.decorators.findIndex(x => x.expression.type === 'CallExpression' && x.expression.callee.type === 'Identifier' && x.expression.callee.name === map1.get('Column')) === -1)
.nodes().forEach((n: namedTypes.ClassProperty) => {
    console.log(`type is ${n.type}`);
        if(n.decorators) {
            n.decorators.push(j.decorator(j.callExpression(j.identifier(map1.get('Column')), [])));
        } else {
            n.decorators = [j.decorator(j.callExpression(j.identifier(map1.get('Column')), []))];
        }
    });

  if(ast) {
    return print(ast).code;
  } else {
  return c.toSource();
  }
=======
    });

    c.find(j.ClassProperty, (n) => !n.decorators || n.decorators.findIndex(x => x.expression.type === 'CallExpression' && x.expression.callee.type === 'Identifier' && x.expression.callee.name === map1.get('Column')) === -1)
        .nodes().forEach((n: namedTypes.ClassProperty) => {
            console.log(`type is ${n.type}`);
            if(n.decorators) {
                n.decorators.push(j.decorator(j.callExpression(j.identifier(map1.get('Column')), [])));
            } else {
                n.decorators = [j.decorator(j.callExpression(j.identifier(map1.get('Column')), []))];
            }
        });

    if(ast) {
        return print(ast).code;
    } else {
        return c.toSource();
    }
>>>>>>> f3275800310b78da9d74837934cfd23039bbd090
//    return print(ast).code;
}

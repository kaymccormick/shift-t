// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {namedTypes} from "ast-types/gen/namedTypes";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { parse, print } from 'recast';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { builders} from 'ast-types';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {Collection, Map, List} from 'immutable';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {NodePath} from "ast-types/lib/node-path";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {SpecifierKind} from "ast-types/gen/kinds";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { fromNodes } from 'jscodeshift/src/Collection';


module.exports = function (fileInfo: FileInfo, api: API, options: Options): string {
    let ast: namedTypes.Node;

    const j = api.jscodeshift;
    let c;
    if(options['parse-with'] === 'recast') {
        ast = parse(fileInfo.source, {

            parser: require("recast/parsers/typescript")});
        c = j(ast);
    } else {
        c = j(fileInfo.source);
    }

    const m = c.find(j.ImportDeclaration, (n: namedTypes.ImportDeclaration): boolean => {
        return n.source.type === (ast ? 'Literal' : 'StringLiteral')
		&& n.source && n.source.value === 'typeorm'
 		&& n.specifiers });
    let map2: Map<string, string> = Map<string, string>();
    let map1: Map<string, string> = Map<string, string>(
    	  List.of<SpecifierKind>(...m.nodes()
            .flatMap((n: namedTypes.ImportDeclaration): SpecifierKind[] =>
                n.specifiers || [] ))
            .map((specifier: SpecifierKind): [string, string] =>
                specifier.type === 'ImportSpecifier' &&
                specifier.imported && specifier.local ? [specifier.imported.name, specifier.local.name] : ['', ''])
            .filter((x): boolean => x[0].length));

    const imports = ['Column', 'Entity'];
    imports.forEach((importName): void => {
        if(!map1.has(importName) || map1.get(importName) === undefined) {
            map2 = map2.set(importName, importName);
        }
    });
    if(map2.count()) {
        c.nodes()[0].program.body.splice(0, 0, j.importDeclaration(map2.map((importedName, importName): namedTypes.ImportSpecifier => j.importSpecifier(j.identifier(importedName), j.identifier(importName))).valueSeq().toJS(), j.literal('typeorm')));
    }
    map1 = map1.merge(map2);

    c.find(j.ClassDeclaration, (n): boolean => {
        console.log(`type ${n.type}`);
        return !n.decorators || n.decorators.findIndex((x): boolean => x.expression.type === 'CallExpression' && x.expression.callee.type === 'Identifier' && x.expression.callee.name === map1.get('Entity')) === -1;
    }).nodes().forEach((n: namedTypes.ClassDeclaration): void => {
        console.log(`type ${n.type}`);
        if(n.decorators) {
            n.decorators.push(j.decorator(j.callExpression(j.identifier(map1.get('Entity')), [])));
        } else {
            n.decorators = [j.decorator(j.callExpression(j.identifier(map1.get('Entity')), []))];
        }
    });

    c.find(j.ClassProperty, (n): boolean => !n.decorators || n.decorators.findIndex((x): boolean => x.expression.type === 'CallExpression' && x.expression.callee.type === 'Identifier' && x.expression.callee.name === map1.get('Column')) === -1)
        .nodes().forEach((n: namedTypes.ClassProperty): void => {
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
//    return print(ast).code;
}

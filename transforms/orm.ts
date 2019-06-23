import {namedTypes} from "ast-types/gen/namedTypes";
import { parse, print } from 'recast';
import { builders} from 'ast-types';
import {Collection, Map, List} from 'immutable';
import {NodePath} from "ast-types/lib/node-path";
import {SpecifierKind} from "ast-types/gen/kinds";

// @ts-ignore
module.exports = function (fileInfo, api, options) {
    const report = api.report;
    const j = api.jscodeshift;
    const c = j(fileInfo.source);


    //      const list1 = List.of<string[]>(
    const list1 =
        List.of<NodePath>(
            c.find(j.ImportDeclaration, (n: namedTypes.ImportDeclaration) => {
                return n.source.type === 'StringLiteral' && n.source && n.source.value === 'typeorm'
        && n.specifiers
            })).flatMap((p: NodePath): SpecifierKind[] => {
            return p && p.value && p.value.specifiers || [];
        });
    if(list1.size) {
        const list2 = list1
            .map((specifier: SpecifierKind): string[] =>
                specifier.type === 'ImportSpecifier' &&
                specifier.imported && specifier.local ? [specifier.imported.name, specifier.local.name] : [])
        //.filter(x => x.length);
        console.log(`${fileInfo.path} ${JSON.stringify(list1.toJS())}`);
    }
    c.find(j.ImportDeclaration, (n) => n.importKind === 'value' && n.source.type === 'StringLiteral' && n.source.value === 'typeorm').forEach((p: NodePath) => {
        //console.log(p.value.type);
    });
    //    c.find(j.ClassDeclaration).forEach((p: NodePath) => {
    //      const classDecl = p.value;
    return;
}

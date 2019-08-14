import {visit,getFieldNames, getFieldValue, eachField, namedTypes, builders} from 'ast-types';
import { NodePath } from 'ast-types/lib/node-path';
import { Map, List, Set} from 'immutable';
import { ValueKind } from './types';

export class FailedCompare extends Error {

}
export type CopyTreeResult = Map<string, ValueKind>;
export function compareAst(node1: namedTypes.Node, node2: namedTypes.Node) {
//    report?: (arg: string) => void,
//    level: number = 0): CopyTreeResult {
    let cache: List<Map<string, any>> = List<Map<string, any>>();
    let depth = 0;
    let curNode = node2;
    let context = List<namedTypes.Node>();
    try {

        visit(node1, {
            visitNode(path: NodePath<namedTypes.Node>): any {
                depth++;
                if (depth > 1) {
                    context = context.push(curNode);
                    if (typeof path.name === 'number') {
                        // @ts-ignore
                        curNode = curNode[path.parentPath.name][path.name];
                    } else {
		    // @ts-ignore
                        curNode = curNode[path.name];
                    }
                    if (!curNode) {
                        throw new FailedCompare(path.name);
                    }
                    console.log(curNode);
                }
                this.traverse(path);
                depth--;
                if (cache.get(depth + 1) === undefined) {
                    cache = cache.set(depth + 1, Map<string, any>());
                }
                if (cache.get(depth) === undefined) {
                    cache = cache.set(depth, Map<string, any>());
                }
                const anode = path.node;
                //@ts-ignore
                if (!namedTypes[anode.type].check(anode)) {
                    throw new Error('invalid node');
                }
                let nary: Set<string> = Set<string>(getFieldNames(anode));
                nary = nary.subtract(cache.get(depth + 1)!.keySeq());
                // @ts-ignore
                const filtered = nary.filter((field) => {
                    const a = getFieldValue(anode, field);
                    const b = getFieldValue(curNode, field);
                    return !(a !== undefined ? Array.isArray(a) ? Array.isArray(b) && a.length === 0 && b.length === 0 : a === b : b !== undefined);
                });

                if (filtered.count() !== 0) {
                    throw new FailedCompare(`ast doesnt mtch: ${filtered}`);
                }
                const result: Map<string, any> = Map<string, any>(
                    nary.map(fName => [fName, getFieldValue(anode, fName)]))
                    .merge(cache.get(depth + 1)!);
                cache = cache.delete(depth + 1);
                if (typeof path.name === 'string') {
                    cache = cache.set(depth,
                        cache.get(depth)!.set(path.name, result));
                } else {
                    const key = path.parentPath.name;
                    let ary = cache.get(depth)!.get(path.parentPath.name)
                        || List<Map<string, any>>();
                    ary = ary.set(path.name, result);
                    cache = cache.set(depth,
                        cache.get(depth)!.set(path.parentPath.name, ary));
                }
                curNode = context.last();
                context = context.pop();
            },
        });
    } catch(error) {
        if(!(error instanceof FailedCompare)) {
            throw error;
        }
        return false;
    }

    return true;
}

import {visit,getFieldNames, getFieldValue, eachField, namedTypes, builders} from 'ast-types';
import { NodePath } from 'ast-types/lib/node-path';
import { Map, List, Set} from 'immutable';
import { ValueKind } from './types';

export type CopyTreeResult = Map<string, ValueKind>;
export function copyTree(node: namedTypes.Node,
    report?: (arg: string) => void,
    level: number = 0): CopyTreeResult {
    let cache: List<Map<string, any>> = List<Map<string, any>>();
    let depth = 0;
    visit(node, {
        visitNode(path: NodePath<namedTypes.Node>): any {
            depth++;
            this.traverse(path);
            depth--;
            if(cache.get(depth + 1) ===undefined ) {
                cache= cache.set(depth + 1, Map<string, any>());
            }
            if(cache.get(depth) === undefined ) {
                cache= cache.set(depth, Map<string, any>());
            }
            const anode = path.node;
            //@ts-ignore
            if(!namedTypes[anode.type].check(anode)) {
                throw new Error('invalid node');
            }
            let nary: Set<string> = Set<string>(getFieldNames(anode));
            nary = nary.subtract(cache.get(depth + 1)!.keySeq());
            const result: Map<string, any> = Map<string, any>(
                nary.map(fName => [fName, getFieldValue(anode, fName)]))
                .merge(cache.get(depth + 1)!);
            cache = cache.delete(depth + 1);
            if(typeof path.name === 'string') {
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
        },
    });

    return cache.get(0)!.get('root');
}

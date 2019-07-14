import { visit, getFieldValue, getFieldNames,eachField, getBuilderName, builders as b, namedTypes as n } from 'ast-types';
import { Map, List, Set} from 'immutable';
import { ok } from 'assert';

export type CopyTreeResult = Map<string, ValueKind>;
export function copyTree(node: namedTypes.Node, report: (arg: string) => void, level: number = 0): CopyTreeResult {
    if(!report) {
        report = (arg): void => {};
    }
    report(`1.0> [${depth}] COPYTREE[ ${level} ${node.type} ]`);
    if(!n[node.type].check(node)) {
        throw new Error(`node of type ${node.type} doesn't check out`);
    }
    let out: Map<string, ValueKind> = Map<string, ValueKind>();
    if(node.comments) {
        out = out.set('comments', List<ValueKind>(node.comments.map(c =>
            copyTree(c, report, level + 1))));
    }
    if(node.loc) {
        //    out = out.set('loc', node.loc);
    }
    report(`x> ${node.type}: ${getFieldNames(node).toString()}`);
    eachField(node, (name, value): void => {
        report(` a> ${node.type}: field ${name}`);
        report(` b> ${node.type}: value ${value}`);
        if (Array.isArray(value)) {
            report('value is array');
            if(typeof value[0]  === 'string') {//instanceof namedTypes.Node) {
                report('beep');
                throw new Error('unexected string input');
            }
            report(`${node.type}: field ${name} length ${value.length}`);
            if(value.length >0) {
                if(value[0].constructor && value[0].constructor.name === "Node") {
                    report('detected constructor Node');
                    const x = List<Map<string,ValueKind>>(value.map((elem: namedTypes.Node): Map<string,ValueKind> => copyTree(elem, report, level + 1)));
                    out = out.set(name, x);
                } else{
                    const x = List<Map<string,ValueKind>>(value.map((elem: namedTypes.Node): Map<string,ValueKind> => copyTree(elem, report, level + 1)));
                    out = out.set(name, x);
                }
            } else{
                out = out.set(name, value);
            }
        } else if(value
        && value.constructor && value.constructor.name === "Node") {
            out = out.set(name, copyTree(value, report, level + 1));
        } else if(value && value.type) {
            out = out.set(name, copyTree(value, report, level + 1));
        } else {{
            out = out.set(name, value);
        }
        }
    });
    if(report) {
        report(`copyTree returning ${JSON.stringify(out, null, 4)}`);
    }
    return out;
}
export function copyTree2(node: namedTypes.Node,
    report: (arg: string) => void,
    level: number = 0): CopyTreeResult|undefined {
    let cache: List<Map<string, any>> = List<Map<string, any>>();
    let depth = 0;
    visit(node, {
        visitNode(path: NodePath<namedTypes.Node>): any {
            let myDepth = depth;
            ok(myDepth === depth);
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
            if(!n[anode.type].check(anode)) {
                throw new Error('invalid node');
            }
            let nary: Set<string> = Set<string>(getFieldNames(anode));
            nary = nary.subtract(cache.get(depth + 1).keySeq());
            const result: Map<string, any> = Map<string, any>(
                nary.map(fName => [fName, getFieldValue(anode, fName)]))
                .merge(cache.get(depth + 1));
            cache = cache.delete(depth + 1);
            if(typeof path.name === 'string') {
                cache = cache.set(depth,
                    cache.get(depth).set(path.name, result));
            } else {
                const key = path.parentPath.name;
                let ary = cache.get(depth).get(path.parentPath.name)
                || List<Map<string, any>>();
                ary = ary.set(path.name, result);
                cache = cache.set(depth,
                    cache.get(depth).set(path.parentPath.name, ary));
            }
        },
    });

    return cache.get(0).get('root');
}

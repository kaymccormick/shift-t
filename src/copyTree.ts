import { getFieldNames,eachField, getBuilderName, builders as b, namedTypes as n } from 'ast-types';
import { Map, List, Set} from 'immutable';

export type CopyTreeResult = Map<string, ValueKind>;
export function copyTree(node: namedTypes.Node, report: (arg: string) => void, level: number = 0): CopyTreeResult {
    if(!report) {
    report = (arg): void => {};
    }
    report(`COPYTREE[ ${level} ${node.type} ]`);
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
    report(`${node.type}: ${getFieldNames(node).toString()}`);
    eachField(node, (name, value): void => {
        report(`${node.type}: field ${name}`);
        report(`${node.type}: value ${value}`);
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

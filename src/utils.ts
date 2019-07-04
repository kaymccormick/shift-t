// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { getFieldNames, getFieldValue, eachField, namedTypes } from 'ast-types';
import { Map,List } from 'immutable';

type ValueKind = any|any[];
//namedTypes.Node | namedTypes.Node[] | string | Map<string, {}> | Map<string, {}>[];

export function copyTree(node: namedTypes.Node): Map<string, ValueKind> {
    let out: Map<string, ValueKind> = Map<string, ValueKind>();
    eachField(node, (name, value): void => {
        if (Array.isArray(value)) {
            if(typeof value[0]  === 'string') {//instanceof namedTypes.Node) {
                throw new Error('');
            }
            if(value.length >0) {
                if(value[0].constructor && value[0].constructor.name === "Node") {
                    const x = List<Map<string,ValueKind>>(value.map((elem: namedTypes.Node): Map<string,ValueKind> => copyTree(elem)));
                    out = out.set(name, x);
                }
            } else{
                out = out.set(name, value);
            }
        } else if(value
        && value.constructor && value.constructor.name === "Node") {
            out = out.set(name, copyTree(value));
        } else if(value && value.type) {
            throw new Error(value.type);
        } else {{
            out = out.set(name, value);
        }
        }
    });
    return out;
}



import { getFieldNames, getFieldValue, eachField, namedTypes } from 'ast-types';
import { Map } from 'immutable';

type ValueKind = namedTypes.Node | namedTypes.Node[] | string | Map<string, {}>;

export function copyTree(node: namedTypes.Node): Map<string, ValueKind> {
    let out: Map<string, ValueKind> = Map<string, ValueKind>();
    eachField(node, (name, value) => {
        if (Array.isArray(value)) {
            if(typeof value[0]  === 'string') {//instanceof namedTypes.Node) {
                throw new Error('');
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



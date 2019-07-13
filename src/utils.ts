// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { getFieldNames, getFieldValue, eachField, namedTypes } from 'ast-types';
import { Map,List } from 'immutable';
import { ValueKind, BasicLogger } from './types';

export type CopyTreeResult = Map<string, ValueKind>;
export function copyTree(node: namedTypes.Node, logger?: BasicLogger, level: number = 0): CopyTreeResult {
    let out: Map<string, ValueKind> = Map<string, ValueKind>();
    if(node.comments) {
        out = out.set('comments', List<ValueKind>(node.comments.map(c =>
            copyTree(c, logger, level + 1))));
    }
    eachField(node, (name, value): void => {
        if (Array.isArray(value)) {
            if(typeof value[0]  === 'string') {//instanceof namedTypes.Node) {
                throw new Error('unexected string input');
            }
            if(value.length >0) {
                if(value[0].constructor && value[0].constructor.name === "Node") {
                    const x = List<Map<string,ValueKind>>(value.map((elem: namedTypes.Node): Map<string,ValueKind> => copyTree(elem, logger, level + 1)));
                    out = out.set(name, x);
                }
            } else{
                out = out.set(name, value);
            }
        } else if(value
        && value.constructor && value.constructor.name === "Node") {
            out = out.set(name, copyTree(value, logger, level + 1));
        } else if(value && value.type) {
            throw new Error(`busted copyTree with ${value.type}`);
        } else {{
            out = out.set(name, value);
        }
        }
    });
    if(logger) {
        logger.debug(`copyTree returning ${JSON.stringify(out, null, 4)}`);
    }
    return out;
}



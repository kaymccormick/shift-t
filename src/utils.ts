// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {getFieldNames, getFieldValue, eachField, namedTypes, NodePath, builders} from 'ast-types';
import { CommentKind } from 'ast-types/gen/kinds';
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
            out = out.set(name, copyTree(value, logger, level + 1));
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

export function normalizeDocComment(report, lines) {
    let newLines = lines.map(line => line.replace(/^\s*\*\s*/, ''));
    if(newLines[0].trim()) {
        newLines.splice(0, 0, '');
    }
    if(newLines[newLines.length - 1].trim()) {
        newLines.splice(newLines.length, 0, ' ');
    } else {
        newLines[newLines.length - 1] = ' ';
    }

    newLines = newLines.map((line, index) => index === 0 ? `*` : index === newLines.length -1 ? line : ` * ${line}`);
    return newLines;
}

export function processComments(report, nodePath: NodePath<namedTypes.Node>) {
    const node = nodePath.node;
    const comments = node.comments;
    if(!comments || !comments.length) {
        return;
    }
    comments.forEach((comment: CommentKind): void => {
        if(comment.type === "CommentBlock" || comment.type == "Block") {
            const val = comment.value;
            report(val.replace(/\n/g, '\\n'));
            let containsAtUuid = val.indexOf('@uuid') !== -1;
            const lines = val.split(/\r?\n/g);
            let docComment = false;
            let singleLine = false;
            if(lines[0] === '*') {
                docComment = true;
            }
            if(lines.length === 1) {
                singleLine = true;
            }
            //report(`${singleLine} ${docComment} ${containsAtUuid}`);
            if(containsAtUuid || docComment) {
                if(!containsAtUuid) {
                    report('here');
                }
                const newLines = normalizeDocComment(report, lines);
                const newVal = newLines.join('\n');
                //  report(`processComments: ${newVal}\n.\n`);
                comment.value = newVal;
            }
        }
    });
}

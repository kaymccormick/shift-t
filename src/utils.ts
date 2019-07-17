// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {getFieldNames, getFieldValue, eachField, namedTypes, builders} from 'ast-types';
import { CommentKind } from 'ast-types/gen/kinds';
import { Map,List } from 'immutable';
import { ValueKind, BasicLogger } from './types';
export { copyTree, CopyTreeResult } from './copyTree.prune';

import { NodePath } from 'ast-types/lib/node-path';

export const promises: Promise<any>[] = [];
export function p<T>(promise: Promise<T>): Promise<T> {
    promises.push(promise);
    return promise;
}



export function normalizeDocComment(report: any, lines: string[]): string[] {
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

/**
 * Purpose: ?
 */
export function processComments(report: any, nodePath: NodePath<namedTypes.Node>) {
    const node = nodePath.node;
    let column: number|undefined;
    if(node.loc) {
        column = node.loc.start.column;
    }
    report(`${node.type} ${column}`);

    const comments = node.comments;
    if(!comments || !comments.length) {
        return;
    }
    comments.forEach((comment: CommentKind): void => {
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
    });
}

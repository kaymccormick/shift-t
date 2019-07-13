import { parse, print } from 'recast';
import path from 'path';
import fs from 'fs';
import assert from 'assert';
import EntityCore from "classModel/lib/src/entityCore";
import  winston, { format } from 'winston';
import finder from 'find-package-json';
import {builders as b, NodePath} from 'ast-types';
import { copyTree }from '../src/utils';
import {StatementKind} from "ast-types/gen/kinds";
import {namedTypes,visit} from 'ast-types';


const consoleTransport  = new winston.transports.Console({level: 'error'});
const file = new winston.transports.File({level: 'debug', filename:
      'embed.log'})
const loggerTranports = [consoleTransport, file];
const logger = winston.createLogger({format: format.json(),
    transports:loggerTranports });

function embedUuidInComment(report, j, uuid: string, nodePath: NodePath<namedTypes.Node>, node: namedTypes.Node, args: any) {
let result: namedTypes.commentBlock|undefined = undefined;
    const { lastComment }  = args;
    if(uuid === undefined) {
        throw new Error('invalid uuid');
    }
    if(nodePath) {
        if(nodePath.value !== nodePath.node ) {
            throw new Error('eep');
        }
        const p =  nodePath.parentPath;
    }
    const comments = node.comments;
    if(comments && comments.length) {
        let commentIndex = lastComment? comments.length - 1 : 0;
        if(lastComment && commentIndex === 0) {
            throw new Error('adding comment, error');
            node.comments.splice(0, 0, j.commentBlock('empty'));
            commentIndex += 1;
        }

        const comment = comments[commentIndex];
        const val = comment.value;
        result = comment;
        const match = /@uuid\s+(\S+)/.exec(val);
        if(match) {
            if(match[1] !== uuid) {
                node.comments[commentIndex].value = val.replace(/@uuid\s+(\S+)/, `@uuid ${uuid}`);
            }

        } else {
            const newVal = `${val}\n * @uuid ${uuid}\n`;
            node.comments[commentIndex].value = newVal;
            report(newVal);
        }
    } else {
        const comment = j.commentBlock(`* @uuid ${uuid}\n`);
        result = comment;
        if(lastComment) {
            node.comments = [j.commentBlock('empty'), comment];
        } else {
            node.comments = [comment];
        }
    }
    return result;
}

module.exports = function(fileInfo, api, options) {
    const report = api.report;
    const j = api.jscodeshift;
    const r = j(fileInfo.source);
    const fullpath = path.resolve(fileInfo.path);

    const f = finder(fileInfo.path);
    const next = f.next();
    const packageInfo = next.value;
    const pkgFile = next.filename;
    let packageName: string | undefined = undefined;
    if(packageInfo !== undefined) {
        packageName = packageInfo.name;
    }
    if(packageName === undefined) {
        throw new Error('need package name');
    }

    const p =  path.resolve(fileInfo.path);
    const model = JSON.parse(fs.readFileSync('dump.json', { encoding: 'utf-8'}));
    const project = model.Project.find((project): boolean => {
        return project.name === packageName;
    });
    if(!project) {
        throw new Error('no project');
    }
    if(!project.path) {
        throw new Error('no project path');
    }

    const r2 = path.relative(project.path!, p);
    const name = r2.replace(/\.tsx?$/, '');

    const module1 = model.Module.find((module2): boolean => module2.name === name);
    if(!module1) {
        throw new Error(`no module ${name}`);
    }
    report(`Module: ${JSON.stringify(module1)}`);

    const body = r.nodes()[0].program.body;
    const newBody: StatementKind[] = [];
    const newFile1 = copyTree(r.nodes()[0]).toJS();
    let processed = false;
    visit(newFile1, {
        visitStatement(path: NodePath<namedTypes.Statement>): any {
            if(!processed) {
                const comment = embedUuidInComment(report, j, module1.uuid, path, path.node, {});
                if(comment === undefined) {
                throw new Error('unexpected undefined');
                }
                report(comment.value);
                processed = true;
            }
            return false;
        },
/*        visitClassDeclaration(path: NodePath<namedTypes.ClassDeclaration>): boolean {
            const classDecl = path.node;
            let theNode = classDecl;
            let thePath = path;
            const parent = path.parent;
            if(parent && parent.node &&(parent.node.type === 'ExportDefaultDeclaration' || parent.node.type === 'ExportNamedDeclaration')) {
                theNode = parent.node;
                thePath = parent;
            }
            const class_ = model['Class'].find((class__) => {
                return class__.moduleId === module1.id && classDecl.id && class__.name === classDecl.id.name;
            });
            if(!class_) {
                report(classDecl.id!.name);
                report(model.Class.filter((class__) => class__.moduleId == module1.id));
                throw new Error('no class');
            }

            const comment = embedUuidInComment(report, j, class_.uuid, thePath, theNode, { lastComment: true });
            report(comment.value);
            return false;
        },*/
    });
    try {
        const xx = print(newFile1);
        const code = xx.code;
//        report(`code is ${code}`);
        return code;
    } catch(error) {
        report(error.message);
    }
};

import { parse, print } from 'recast';
import path from 'path';
import fs from 'fs';
import assert from 'assert';
import EntityCore from "classModel/lib/src/entityCore";
import  winston, { format } from 'winston';
import finder from 'find-package-json';
import { builders as b } from 'ast-types';
import { copyTree }from '../src/utils';
import {StatementKind} from "ast-types/gen/kinds";
import {namedTypes} from 'ast-types';


const consoleTransport  = new winston.transports.Console({level: 'warn'});
const file = new winston.transports.File({level: 'debug', filename:
      'embed.log'})
const loggerTranports = [consoleTransport, file];
const logger = winston.createLogger({format: format.json(),
    transports:loggerTranports });

function embedUuidInComment(j, uuid: string, node: namedTypes.Node) {
         const comments = node.comments;
    if(comments && comments.length) {
                const comment = comments[0];
                const val = comment.value;
                const match = /@uuid\s+(\S+)/.exec(val);
                if(match) {
                    if(match[1] !== module.uuid) {
                      node.comments[0].value = val.replace(/@uuid\s+(\S+)/, `@uuid ${module.uuid}`);
                      }
                    
                } else {
                    const newVal = `${val}\n * @uuid ${module.uuid}\n`;
                        node.comments[0].value = newVal;
                        console.log(newVal);
                }
            } else {
            const comment = j.commentBlock(`* @uuid ${module.uuid}\n`);
            node.comments = [comment];
           }
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
    const r2 = path.relative(path.dirname(pkgFile), p);
    const name = p.replace(/\.tsx?$/, '');

    const model = JSON.parse(fs.readFileSync('dump.json', { encoding: 'utf-8'}));
    const project = model.Project.find((project): boolean => {
    console.log(project);
    return project.name === packageName;
    });
    if(!project) {
    throw new Error('no project');
    }
    const module = model.Module.find((module): boolean => module.name === name);
    if(!module) {
    throw new Error(`no module ${name}`);
    }

    const body = r.nodes()[0].program.body;
    const newBody: StatementKind[] = [];
    body.forEach((stmt: StatementKind, index: number): void => {
        const newStmt = copyTree(stmt, logger).toJS();
        console.log(JSON.stringify(newStmt));
        if(index === 0) {
            embedUuidInComment(j, module.uuid, newStmt);
        }
        newBody.push(newStmt);
    });

     j(newBody).find(namedTypes.ClassDeclaration).nodes().forEach((classDecl): void => {
     const class_ = model['Class'].find((class__) => {
     return class__.moduleId === module.id && classDecl.id && class__.name === classDecl.id.name;
     });
     if(!class_) {
     console.log(classDecl.id!.name);
console.log(model.Class.filter((class__) => class__.moduleId == module.id));
     throw new Error('no class');
     }
     
     });
     



    const newFile = b.file(b.program(newBody));
    try {
        const xx = print(newFile);
        const code = xx.code;
        report(`code is ${code}`);
        return code;
    } catch(error) {
        report(error.message);
    }
};

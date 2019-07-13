/**
 * Main AST collector script.
 */
import {Promise} from 'bluebird';
import {ArgumentParser} from 'argparse';
import fs from 'fs';
import {namedTypes} from 'ast-types/gen/namedTypes';
import path from 'path';
import {promisify} from 'util';
import {parse} from 'recast';
import EntityCore from "classModel/lib/src/entityCore";
import {processSourceModule} from "../src/Collector";
import {createConnection} from "../src/TypeOrm/Factory";
import finder from 'find-package-json';
import {doProject} from "../src/process";
import{RestClient}from '../src/RestClient';
import AppError from '../src/AppError';

import  winston, { format } from 'winston';
/*const { combine, timestamp, label, printf } = format;*/
import {Transport} from '../src/Transport';

import { Factory } from 'classModel/lib/src/entity/core/Factory';
import uuidv4 from 'uuid/v4';
import { TransformUtilsArgs } from '../src/transformUtils';

const parser = new ArgumentParser({});
parser.addArgument([ '--level' ], { help: 'console log level' });
parser.addArgument([ 'dir' ], { help: 'dir to search' });
const args = parser.parseArgs();

/*const myFormat = printf(({ level, message, label, timestamp, type, meta}) => {
    return `${timestamp} [${type}] ${level}: ${message} ${JSON.stringify(meta)}`;
});*/

try {
    fs.unlinkSync('collect.log');

}
catch(error) {
}

import File = namedTypes.File;
const runUuid = uuidv4();
const urlBase = 'http://localhost:7700/cme'
const consoleTransport  = new winston.transports.Console({level: args.level || 'warn'});
const file = new winston.transports.File({level: 'debug', filename:
      'collect.log'})
const loggerTranports = [consoleTransport, file/*, syslogTransport*/];
const logger = winston.createLogger({format: format.json(), /*combine(timestamp(), myFormat),*/ transports:loggerTranports,
/*    defaultMeta: { runUuid }*/});

const restClient = new RestClient(urlBase, new Factory(logger));
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
//console.log = () => {throw new Error('no console use')};

import { HandleAst } from '../src/types';
import {Connection} from "typeorm";

function reportError(error: Error): void {
    logger.warn(error.toString() +'\n' + error.message.toString() + '\n', { error });
}

function processFile(args: TransformUtilsArgs,
    project: EntityCore.Project,
    fname: string,
    handleAst: HandleAst,
): Promise<void> {
    args.logger.debug('processFile', { type: 'functionInvocation', project: project.toPojo(), path: fname });
    const content = fs.readFileSync(fname, { 'encoding': 'utf-8' });
    let ast:    File|undefined = undefined;
    try {
        args.logger.debug('begin parsing');
        ast = parse(content, {
            parser: require("recast/parsers/typescript")
        });
        args.logger.debug('end parsing');
    }catch(error) {
        reportError(new Error(`unable to parse file ${fname}: ${error.message}`));
        return Promise.resolve(undefined);
    }
    if(ast === undefined) {
        reportError(new Error('no ast'));

        return Promise.resolve(undefined);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((): Promise<any> =>  {
        args.logger.debug(`begin process module ${fname}\n`);
        // PM5
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion,@typescript-eslint/no-explicit-any
        return processSourceModule(args, project, fname, ast!).then(/*PM7*/(): Promise<any> => handleAst(args, project, fname, ast!)).then(/*PM8*/(): void => {
            args.logger.debug(`end process module ${fname}\n`);
        }).catch((error): void => {
            logger.error('error3', {error});
            //reportError(error);
        });
    })();
}

function processEntry(args: TransformUtilsArgs,project: EntityCore.Project, path1: string, ent: fs.Dirent, processDir: (args: TransformUtilsArgs, project: EntityCore.Project, dir: string, handleAst: HandleAst) => Promise<void>, handleAst: HandleAst): Promise<void> {
    const fname = path.join(path1, ent.name);
    if(ent.isDirectory() && ent.name !== 'node_modules') {
        return processDir(args, project, fname, handleAst);
    } else if(ent.isFile() && /\.ts$/.test(ent.name)) {
        return processFile(args, project, fname, handleAst);
    }
    return Promise.resolve<void>(undefined);
}

function processDir(args: TransformUtilsArgs,
    project: EntityCore.Project,
    dir: string,
    handleAst: HandleAst): Promise<void> {
    //PM6
    args.logger.debug('ENTRY processDir', { dir, project });
    return readdir(dir, { withFileTypes: true})
        .then(/*PM9*/(ents: fs.Dirent[]): Promise<void> => {
            args.logger.debug('processDir got dir ents');
            return ents.map((ent): () => Promise<void> =>
                (): Promise<void> => processEntry(args,
                    project,
                    dir,
                    ent,
                    processDir,
                    handleAst))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .reduce((a: Promise<any>, v: () => Promise<any>): Promise<any> => a.then(/*PM10*/(): Promise<void> => v()), Promise.resolve(/*PM11*/undefined));
        });
}

const dir = args.dir;
const f = finder(dir);
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
logger.info('begin run', {program: process.argv[1], dir, packageName});

// PM1             /* PM12 */
createConnection(logger).then((connection: Connection): Promise<void> => {
/*try {
    const appTransport = new Transport({connection});
    logger.add(appTransport);
    } catch(error) {
    }*/
    return ((): Promise<void> => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handlers: (() => any)[] = [];

        logger.debug('loading collector modules');
        fs.readdirSync(path.join(__dirname, '../src/collect'), { withFileTypes: true })
            .forEach((entry): void => {
                const match = /^(.*)\.tsx?$/i.exec(entry.name);
                if(entry.isFile() && match) {
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    const module = require(`../src/collect/${match[0]}`);
                    handlers.push(module.default(connection));
                }
            });

        const projectRepo = connection.getRepository(EntityCore.Project);
        const getOrCreateProject = (name: string, path: string): Promise<EntityCore.Project> => {
            return projectRepo.find({name}).then(/*PM13*/(projects: EntityCore.Project[]): Promise<EntityCore.Project> => {
                if (!projects.length) {
                    // PM3
                    return projectRepo.save(new EntityCore.Project(name, path, []));
                } else {
                    return Promise.resolve(/*PM14*/projects[0]);
                }
            });
        }
        /* No op? */
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const handleAst = (args: TransformUtilsArgs, project: EntityCore.Project,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
            fname: string, ast: namedTypes.File): Promise<void> => {
            return Promise.resolve(undefined);
        };
        const args: TransformUtilsArgs = {connection, restClient, logger};
        //PM2
        return getOrCreateProject(packageName ||'', path.dirname(pkgFile!)).then(/*PM15*/(project): Promise<void> => {
            logger.debug('got project', {project});
            //PM4
            return stat(dir).then(/*PM16*/(stats): Promise<void> => {
                logger.debug('got stats', { path: dir, stats });
                if(stats.isFile()) {
                    return processFile(args, project, dir, handleAst);
                } else if(stats.isDirectory()) {
                    return processDir(args, project, dir, handleAst);
                }
                return Promise.resolve(undefined);
            }).then(/*PM17*/(): Promise<void> => {
                args.logger.info('calling doProject', { project: project.toPojo() });
                return doProject(project, connection, args.logger).then((): void => {
                    args.logger.debug(`completed doProject for ${project.name}`);
                });
            }).catch((error: Error): void => {
                logger.error('error5', {error});
                process.exit(1);
            });
        });
    })().then((): Promise<void> => {
        logger.info('Closing database connection.');
        connection.close();
        return Promise.resolve(undefined);
    });
}).catch((error: Error): void => {
    process.stderr.write(error.message + '\n');
    //logger.error(`Error: ${error.message}`, {error});
    //reportError(error);
});


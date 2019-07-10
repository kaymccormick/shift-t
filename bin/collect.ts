import {Promise} from 'bluebird';
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
import winston from 'winston';
import { Factory } from 'classModel/lib/src/entity/core/Factory';
//import { Syslog } from 'winston-syslog';

//const syslogTransport = new Syslog({});

import File = namedTypes.File;
const urlBase = 'http://localhost:7700/cme'
const console  = new winston.transports.Console({level: 'info'});
const file = new winston.transports.File({level: 'debug', filename:
      'collect.log'})
const logger = winston.createLogger({transports:[console, file/*, syslogTransport*/]});

const restClient = new RestClient(urlBase, new Factory(logger));
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
//console.log = () => {throw new Error('no console use')};

import { Args, HandleAst } from '../src/types';
import {Connection} from "typeorm";

function reportError(error: Error): void {
    logger.warn(error.toString() +'\n' + error.message.toString() + '\n', { error });
}

function processFile(args: Args,
    project: EntityCore.Project,
    fname: string,
    handleAst: HandleAst,
): Promise<void> {
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
        return processSourceModule(args, project, fname, ast!).then(/*PM7*/(): Promise<any> => handleAst(args, project, fname, ast!)).then(/*PM8*/():void => {
            args.logger.debug(`end process module ${fname}\n`);
        }).catch(error => {
        logger.error('error3', {error});
            //reportError(error);
        });
    })();
}

function processEntry(args: Args,project: EntityCore.Project, path1: string, ent: fs.Dirent, processDir: (args: Args, project: EntityCore.Project, dir: string, handleAst: HandleAst) => Promise<void>, handleAst: HandleAst): Promise<void> {
    const fname = path.join(path1, ent.name);
    if(ent.isDirectory() && ent.name !== 'node_modules') {
        return processDir(args, project, fname, handleAst);
    } else if(ent.isFile() && /\.ts$/.test(ent.name)) {
        return processFile(args, project, fname, handleAst);
    }
    return Promise.resolve<void>(undefined);
}

function processDir(args: Args,
    project: EntityCore.Project,
    dir: string,
    handleAst: HandleAst): Promise<void> {
    //PM6
    args.logger.debug('ENTRY processDir', { dir, project });
    return readdir(dir, { withFileTypes: true})
        .then(/*PM9*/(ents: fs.Dirent[]): Promise<void> => {
            args.logger.debug('processDir got dir ents');
            return ents.map((ent): () => Promise<void> =>
                () => processEntry(args,
                    project,
                    dir,
                    ent,
                    processDir,
                    handleAst))
                .reduce((a: Promise<any>, v: () => Promise<any>): Promise<any> => a.then(/*PM10*/() => v()), Promise.resolve(/*PM11*/undefined));
        });
}

const dir = process.argv[2];
const f = finder(dir);
const packageInfo = f.next().value;
let packageName: string | undefined = undefined;
if(packageInfo !== undefined) {
    packageName = packageInfo.name;
}
if(packageName === undefined) {
    throw new Error('need package name');
}
logger.info('begin run', {program: process.argv[1], dir, packageName});

// PM1             /* PM12 */
createConnection(logger).then((connection: Connection) => {
    const handlers: (() => any)[] = [];

    logger.debug('loading collector modules');
    fs.readdirSync(path.join(__dirname, '../src/collect'), { withFileTypes: true })
        .forEach(entry => {
            const match = /^(.*)\.tsx?$/i.exec(entry.name);
            if(entry.isFile() && match) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
                const module = require(`../src/collect/${match[0]}`);
                handlers.push(module.default(connection));
            }
        });

    const projectRepo = connection.getRepository(EntityCore.Project);
    const getOrCreateProject = (name: string): Promise<EntityCore.Project> => {
        return projectRepo.find({name}).then(/*PM13*/(projects: EntityCore.Project[]) => {
            if (!projects.length) {
            // PM3
                return projectRepo.save(new EntityCore.Project(name, []));
            } else {
                return Promise.resolve(/*PM14*/projects[0]);
            }
        });
    }
    /* No op? */
    const handleAst = (args: Args, project: EntityCore.Project,
        fname: string, ast: namedTypes.File): Promise<void> => {
        return Promise.resolve(undefined);
    };
    const args: Args = {connection, restClient, logger};
    //PM2
    return getOrCreateProject(packageName ||'').then(/*PM15*/(project) => {
    logger.debug('got project', {project});
        //PM4
        return stat(dir).then(/*PM16*/stats => {
             logger.debug('got stats', { path: dir, stats });
            if(stats.isFile()) {
                return processFile(args, project, dir, handleAst);
            } else if(stats.isDirectory()) {
                return processDir(args, project, dir, handleAst);
            }
        }).then(/*PM17*/() => {
            args.logger.debug('calling doProject');
            return doProject(project, connection, args.logger).then(() => {
            args.logger.debug('here');
});
        }).catch((error: Error) => {
        logger.error('error5', {error});
        });
    });
    }).then(() => {
    connection.close();
    logger.debug('final then');
    })
.catch((error: Error): void => {  // PM1
    connection.close();
throw new Error();
}).catch((error: Error): void => {
logger.error('error6', {error});
    //reportError(error);
});


import fs from 'fs';
import {namedTypes} from 'ast-types/gen/namedTypes';
import path from 'path';
import {promisify} from 'util';
import {parse} from 'recast';
import {Connection} from "typeorm";
import {EntityCore} from "classModel";
import {processSourceModule} from "../src/Collector";
import {createConnection} from "../src/TypeOrm/Factory";
import {HandleAst} from '../src/types';
import finder from 'find-package-json';
import {doProject} from "../src/process";
import File = namedTypes.File;

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
//console.log = () => {throw new Error('no console use')};

function reportError(error: Error) {
    process.stderr.write(error.toString() +'\n' + error.message.toString() + '\n');
}
 
function processFile(connection: Connection,
    project: EntityCore.Project,
    fname: string,
    handleAst: HandleAst,
): Promise<void> {
    const content = fs.readFileSync(fname, { 'encoding': 'utf-8' });
    let ast:    File|undefined = undefined;
    try {
    process.stderr.write('begin parsing\n');
        ast = parse(content, {
            parser: require("recast/parsers/typescript")
        });
    process.stderr.write('end parsing\n');
    }catch(error) {
        reportError(new Error(`unable to parse file ${fname}: ${error.message}`));
        return Promise.resolve(undefined);
    }
    if(ast === undefined) {
        reportError(new Error('no ast'));

        return Promise.resolve(undefined);
    }

    process.stderr.write(`begin process module ${fname}\n`);
    const r = processSourceModule(connection, project, fname, ast!).then(() => handleAst(connection, project, fname, ast!)).then(() => {
        process.stderr.write(`end process module ${fname}\n`);
        }).catch(error => {
        reportError(error);
    });
    return r;
}

function processEntry(connection: Connection,project: EntityCore.Project, path1: string, ent: fs.Dirent, processDir: (connection: Connection, project: EntityCore.Project, dir: string, handleAst: HandleAst) => Promise<void>, handleAst: HandleAst): Promise<void> {
    const fname = path.join(path1, ent.name);
    if(ent.isDirectory() && ent.name !== 'node_modules') {
        return processDir(connection, project, fname, handleAst);
    } else if(ent.isFile() && /\.ts$/.test(ent.name)) {
        return processFile(connection, project, fname, handleAst);
    }
    return Promise.resolve<void>(undefined);
}

function processDir(connection: Connection,
    project: EntityCore.Project,
    dir: string,
    handleAst: HandleAst): Promise<void> {
    return readdir(dir, { withFileTypes: true})
        .then((ents: fs.Dirent[]): Promise<void> =>
            ents.map((ent): Promise<void> =>
                processEntry(connection,
                    project,
                    dir,
                    ent,
                    processDir,
                    handleAst))
                .reduce((a, v) => a.then(() => v).catch(error => {
                    reportError(error);
                }), Promise.resolve<void>(undefined)));
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

createConnection().then(connection => {
    const handlers: (() => any)[] = [];

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
        return projectRepo.find({name}).then(projects => {
            if (!projects.length) {
                return projectRepo.save(new EntityCore.Project(name, []));
            } else {
                return projects[0];
            }
        });
    }
    const handleAst = (connection: Connection, project: EntityCore.Project,
        fname: string, ast: namedTypes.File): Promise<void> => {
        return Promise.resolve(undefined);
    };
    return getOrCreateProject(packageName ||'').then((project) => {
    stat(dir).then(stats => {
    if(stats.isFile()) {
        return processFile(connection, project, dir, handleAst);
        } else if(stats.isDirectory()) {
        return processDir(connection, project, dir, handleAst);
        }
        }).then(() => {
            return doProject(project, connection);
        });
    });
}).catch(error => {
    reportError(error);
});

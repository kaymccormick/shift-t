import fs from 'fs';
import { namedTypes } from 'ast-types/gen/namedTypes';
import nodes from 'ast-types/gen/nodes';
import path from 'path';
import { promisify } from 'util';
import { parse } from 'recast';
import { Connection } from "typeorm";
import {EntityCore} from "classModel";
import {processSourceModule} from "../src/Collector";
import {createConnection} from "../src/TypeOrm/Factory";
import { HandleAst} from'../src/types';
import finder from 'find-package-json';
import { Record } from 'immutable';

const readdir = promisify(fs.readdir);

function processFile(connection: Connection,
    project: EntityCore.Project,
    fname: string,
    handleAst: HandleAst,
): Promise<void> {
    const content = fs.readFileSync(fname, { 'encoding': 'utf-8' });
    let ast: nodes.File|undefined = undefined;
    try {
        ast = parse(content, {
            parser: require("recast/parsers/typescript")
        });
    }catch(error) {
        console.log(`unable to parse file ${fname}: ${error.message}`);
        return Promise.resolve(undefined);
    }
    if(ast === undefined) {
    console.log('no ast');
        return Promise.resolve(undefined);
    }

    return processSourceModule(connection, project, fname, ast!).then(() => handleAst(connection, project, fname, ast!)).catch(error => {
    console.log(error.message);
    });
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
                                console.log(error.message);
                }), Promise.resolve<void>(undefined)));
}

const dir = process.argv[2];
const f = finder(dir);
const packageInfo = f.next().value;
if(packageInfo === undefined) {
    throw new Error('package.json');
}
const packageName = packageInfo.name;
if(packageName === undefined) {
    throw new Error('need package name');
}

/*
const packageJson = path.join(dir, 'package.json');
const pJSon = fs.readFileSync(packageJson, { encoding: 'utf-8' });
const packageInfo = JSON.parse(pJSon);*/

//
// const processEntityCore.Project = (connection: Connection, project: EntityCore.Project): Promise<void> => {
// };

createConnection().then(connection => {
    const handlers: (() => any)[] = [];

    fs.readdirSync(path.join(__dirname, '../src/collect'), { withFileTypes: true }).forEach(entry => {
        const match = /^(.*)\.tsx?$/i.exec(entry.name);
        if(entry.isFile() && match) {
            const module = require(`../src/collect/${match[0]}`);
            handlers.push(module.default(connection));
        }
    });

    const c = connection;
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
    const handleAst = (connection: Connection, project: EntityCore.Project,fname: string,ast: namedTypes.File): Promise<void> => {
        return Promise.resolve(undefined);
    };
    return getOrCreateProject(packageName).then(project => processDir(connection, project, dir, handleAst));
}).catch(error => {
    console.log(error.message);
});

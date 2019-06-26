import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { parse } from 'recast';
import { Connection } from "typeorm";
import {EntityCore} from "classModel";
import {processSourceModule} from "../src/Collector";
import {createConnection} from "../src/TypeOrm/Factory";
import finder from 'find-package-json';

const readdir = promisify(fs.readdir);

function processFile(connection: Connection,
project: EntityCore.Project,
fname: string): Promise<void> {
    const content = fs.readFileSync(fname, { 'encoding': 'utf-8' });
    const ast = parse(content, { parser: require("recast/parsers/typescript") });
    return processSourceModule(connection, project, fname, ast)
}

function processEntry(connection: Connection,project: EntityCore.Project, path1: string, ent: fs.Dirent, processDir: (connection: Connection, project: EntityCore.Project, dir: string) => Promise<void>): Promise<void> {
    const fname = path.join(path1, ent.name);
//    console.log(fname);
    if(ent.isDirectory()) {
        return processDir(connection, project, fname);
    } else if(ent.isFile() && /\.ts$/.test(ent.name)) {
        return processFile(connection, project, fname);
    }
    return Promise.resolve<void>(undefined);
}

function processDir(connection: Connection, project: EntityCore.Project, dir: string): Promise<void> {
    return readdir(dir, { withFileTypes: true}).then((ents: fs.Dirent[]): Promise<void> =>
        ents.map((ent): Promise<void> => processEntry(connection, project, dir, ent, processDir)).reduce((v, a) => a.then(() => v), Promise.resolve<void>(undefined)));
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
    return getOrCreateProject(packageName).then(project => processDir(connection, project, dir));
}).catch(error => {

    console.log(error);
});

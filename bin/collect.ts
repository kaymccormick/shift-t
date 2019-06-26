import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
const readdir = promisify(fs.readdir);

const dir = process.argv[2];
import { parse } from 'recast';
import {processSourceModule} from "../src/Collector";

function processFile(fname: string): Promise<void> {
    const content = fs.readFileSync(fname, { 'encoding': 'utf-8' });
    const ast = parse(content, { parser: require("recast/parsers/typescript") });
    return processSourceModule(fname, ast)
}

function processEntry(path1: string, ent: fs.Dirent, processDir: (dir: string) => Promise<void>): Promise<void> {
    const fname = path.join(path1, ent.name);
    console.log(fname);
    if(ent.isDirectory()) {
        return processDir(fname);
    } else if(ent.isFile() && /\.ts$/.test(ent.name)) {
        return processFile(fname);
    }
    return Promise.resolve<void>(undefined);
}

function processDir(dir: string): Promise<void> {
    return readdir(dir, { withFileTypes: true}).then((ents: fs.Dirent[]): Promise<void> =>
        ents.map((ent): Promise<void> => processEntry(dir, ent, processDir)).reduce((v, a) => a.then(() => v), Promise.resolve<void>(undefined)));
}


processDir(dir).then(() => {
    console.log('done');
}).catch(error => {
    console.log(error);
})

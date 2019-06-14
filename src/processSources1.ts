import * as fs from 'fs';
import * as path from 'path';

const sources = JSON.parse(fs.readFileSync('sources_1.json', { encoding: 'utf-8' }));

import {ArgumentParser} from 'argparse';

export function getDefaultArgumentParser(): ArgumentParser {
const parser = new ArgumentParser({});
parser.addArgument(['--projectId'], { help: 'project ID to operate on' });
parser.addArgument(['--consoleLogLevel'], { help: 'console log level' });
parser.addArgument(['--config'], { help: 'specify config file'});
return parser;
}

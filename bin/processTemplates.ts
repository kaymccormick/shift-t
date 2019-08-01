import ejs from 'ejs';
import  winston, { format } from 'winston';
import { getDefaultArgumentParser } from '../src/argparse';
import { createConnection, EntityCore } from '../src';
import { Connection } from 'typeorm';


const parser = getDefaultArgumentParser();
const args = parser.parseArgs();

const consoleTransport  = new winston.transports.Console(
    {level: args.consoleLogLevel || 'warn'});
const file = new winston.transports.File({level: 'debug', filename:
      'processTemplates.log'})
const loggerTransports = [consoleTransport, file];
const logger = winston.createLogger({format: format.json(),
    transports:loggerTransports});

createConnection(logger).then((connection: Connection): Promise<any> =>  {
    const moduleRepo = connection.getRepository(EntityCore.Module);
    return moduleRepo.find({ projectId: args.projectId }).then((modules: EntityCore.Module[]) => {
        modules.forEach((module): void => {
            ejs.renderFile('templates/module/test.ejs', { module }).then(result => console.log(result));
        });
    });
});
 
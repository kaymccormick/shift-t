import EntityCore from 'classModel/lib/src/entityCore';
import {Promise} from 'bluebird';
import winston from 'winston';
import { ProcessClasses } from './ProcessClasses';
import { TransformUtilsArgs } from '../../transformUtils';
import { builders as b } from 'ast-types';

const consoleTransport  = new winston.transports.Console({level: 'debug'});
const file = new winston.transports.File({level: 'debug', filename:
      'collect.log'})
const loggerTransports = [consoleTransport, file/*, syslogTransport*/];
const logger = winston.createLogger({format: winston.format.json(), transports: loggerTransports});

test('1', () => {
    const connection = {};
    const restClient = {};
    const module = new EntityCore.Module();
    const args: TransformUtilArgs = { connection, restClient, logger };
    const file = b.file(b.program([b.classDeclaration(b.identifier('foo'), b.classBody([]))]));
    return ProcessClasses.processClassDeclarationsAsync(args, module, file);
});
 
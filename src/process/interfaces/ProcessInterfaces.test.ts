import {ProcessInterfaces} from './ProcessInterfaces'
import { Connection } from 'typeorm';
import winston, { Logger } from 'winston';
import { RestClient } from '../..//RestClient';
import { builders } from 'ast-types';
jest.mock('typeorm');
jest.mock('../../RestClient');

beforeEach(() => {
// @ts-ignore
RestClient.mockClear();
Connection.mockClear();
});

const console  = new winston.transports.Console({level: 'error'});
const fileTransport = new winston.transports.File({level: 'debug', filename:
      'test.log'})
const loggerTranports = [console, fileTransport/*, syslogTransport*/];
const logger = winston.createLogger({transports:loggerTranports});

test('processInterfaceDeclarations', () => {
const file = builders.file(builders.program([builders.classDeclaration(builders.identifier('test'), builders.classBody([]))]));
const connection = new Connection();
const restClient = new RestClient({baseUri: ''});

const args: TransformUtilsArgs = { connection, restClient, logger };
ProcessInterfaces.processInterfaceDeclarations(args,module, file);
});
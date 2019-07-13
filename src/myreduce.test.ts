import { myReduce } from './transformUtils';
import winston from 'winston';

const console  = new winston.transports.Console({level: 'debug'});
const fileTransport = new winston.transports.File({level: 'debug', filename:
      'test.log'})
const loggerTranports = [console, fileTransport/*, syslogTransport*/];
const logger = winston.createLogger({transports:loggerTranports});

test('1', () => {
    const in_: PromiseResult = { success: false, hasResult: false };
    return myReduce(logger, [1, 2, 3], in_, (x) => Promise.resolve({success: true, hasResult: true, result: x})).then(r => {
        logger.debug('final', {result: r.result});
    });
});

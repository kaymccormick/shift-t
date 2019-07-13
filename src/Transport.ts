import BaseTransport from 'winston-transport';
import util from 'util';
import {Connection} from "typeorm";
import {LogEntry} from 'classModel/lib/src/entity/core/LogEntry';

export class Transport extends BaseTransport {
    connection: Connection;
constructor(opt: any) {
super(opt);
this.connection = opt.connection;
}
 log(info: any, callback: any) {
    setImmediate(() => {
      this.emit('logged', info);
    });

const logEntry = new LogEntry();
logEntry.message = info.messasge;
const info2 = { ...info };
delete info2.message;
logEntry.meta = info2;
if(this.connection.isConnected) {
console.log(logEntry);
this.connection.manager.save(logEntry).catch((error) => {
process.stderr.write(`${error.message}\n`);
});
}
    // Perform the writing to the remote service
    callback();
  }
  }


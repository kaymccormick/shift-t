import { Connection } from 'typeorm';
import fs from 'fs';
import {createConnection} from "../src/TypeOrm/Factory";
import EntityCore from "classModel/lib/src/entityCore";
import{RestClient}from '../src/RestClient';
import { Factory } from 'classModel/lib/src/entity/core/Factory';
import  winston, { format } from 'winston';
import finder from 'find-package-json';
import { builders as b } from 'ast-types';

const consoleTransport  = new winston.transports.Console({level: 'warn'});
const loggerTranports = [consoleTransport];
const logger = winston.createLogger({format: format.json(),
 transports:loggerTranports });

(async () => {
return createConnection(logger).then((connection: Connection): void => {
//@ts-ignore

return Promise.all(connection.entityMetadatas.map((em): Promise<any> => {
const repository = connection.getRepository(em.target);
return repository.find().then((entities): any => {
//@ts-ignore
return { [em.targetName]: entities.map(e => e && e.toPojo ? e.toPojo() : e) };
});
})).then(results => {
  const out = results.reduce((a, v) => Object.assign({}, a, v), {});
         fs.writeFileSync('dump.json', JSON.stringify(out, null, 4), 'utf-8');
});
});
})();


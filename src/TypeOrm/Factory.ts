import EntityCore from 'classModel/lib/src/entityCore';
import {Connection, createConnection} from "typeorm";
import {Logger as WinstonLogger} from 'winston';
import {Logger} from './Logger';

function myCreateConnection(logger: WinstonLogger): Promise<Connection> {
   return createConnection({
      "type": "postgres",
      "host": "localhost",
      "port": 5432,
      "username": "myapp1",
      "password": "derp123",
      "database": "myapp1",
      "synchronize": true,
      "logging": true,
      "logger": new Logger(logger),
      "migrations": [
         "src/migration/**/*.ts"
      ],
      "subscribers": [
         "src/subscriber/**/*.ts"
      ],
      "cli": {
         "entitiesDir": "src/entity",
         "migrationsDir": "src/migration",
         "subscribersDir": "src/subscriber"
      }, entities: Object.values(EntityCore),
   });
}

export { myCreateConnection as createConnection }

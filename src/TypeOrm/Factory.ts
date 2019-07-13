import { Project,Class,Export,Import,Method,Parameter,Module,Name,Interface,InterfaceMethod,Type,TypeEnum,TSType,InterfaceProperty,TSUnionType,TSTypeReference,LogEntry } from
    "classModel/lib/src/entity/core"
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
      }, entities: [Project, Class, Export, Import, Method, Parameter, Module, Name, Interface,InterfaceMethod,Type,TSType,InterfaceProperty,TSUnionType,TSTypeReference,LogEntry]
   });
}

export { myCreateConnection as createConnection }

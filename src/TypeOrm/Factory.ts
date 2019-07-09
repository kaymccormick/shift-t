import { Project,Class,Export,Import,Method,Parameter,Module,Name,Interface,InterfaceMethod,Type,TypeEnum,TSType,Property,InterfaceProperty,TSUnionType,TSTypeReference } from
    "classModel/lib/src/entity/core"
import {Connection, createConnection} from "typeorm";

function myCreateConnection(): Promise<Connection> {
   return createConnection({
      "type": "postgres",
      "host": "localhost",
      "port": 5432,
      "username": "myapp1",
      "password": "derp123",
      "database": "myapp1",
      "synchronize": true,
      "logging": true,
      "logger": "file",
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
      }, entities: [Project, Class, Export, Import, Method, Parameter, Module, Name, Interface,InterfaceMethod,Type,TSType,Property,InterfaceProperty,TSUnionType,TSTypeReference]
   });
}

export { myCreateConnection as createConnection }

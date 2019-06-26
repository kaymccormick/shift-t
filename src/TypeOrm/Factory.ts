import {Registry, TypeOrmRegistry} from "classModel/lib/src";
import { Project,Class,Export,Import,Method,Parameter,Module } from
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
      "logging": false,
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
      }, entities: [Project, Class, Export, Import, Method, Parameter, Module]
   });
}

export function createRegistry(): Promise<Registry> {
    return myCreateConnection().then(connection =>
        connection.manager.getRepository(Project)
            .find({id: 1}).then(project => new TypeOrmRegistry(connection, project[0])));

}
export { myCreateConnection as createConnection }

import {Registry, TypeOrmRegistry} from "classModel/lib/src";
import { Project } from
        "classModel/lib/src/entity/core"
import {createConnection} from "typeorm";
import * as ts from "typescript/lib/tsserverlibrary";

export function createRegistry(): Promise<Registry> {
    return createConnection().then(connection =>
        connection.manager.getRepository(Project)
            .find({id: 1}).then(project => new TypeOrmRegistry(connection, project[0])));

}

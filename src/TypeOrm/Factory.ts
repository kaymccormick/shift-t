import {InMemoryRegistry} from "../InMemoryRegistry";
import {Registry, TypeOrmRegistry} from "classModel/lib/src";
import {createConnection} from "typeorm";

export function createRegistry(): Promise<Registry> {
    return createConnection().then(connection => new TypeOrmRegistry(connection);
}

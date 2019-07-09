import { namedTypes } from 'ast-types/gen/namedTypes';
import nodes from 'ast-types/gen/nodes';
import {EntityCore} from "classModel";
export type ModuleSpecifier = string;
import { Connection } from 'typeorm';
import { Logger } from 'winston';

export interface Args {
    connection: Connection;
    restClient: RestClient;
    logger: Logger;
}
  
export interface HandleAst {
    (args: Args, project: EntityCore.Project,fname: string,ast: namedTypes.File): Promise<void>;
}

export interface ImportContext {
    module: ModuleSpecifier;
    moduleEntity: EntityCore.Module;
}

export interface HandleImportSpecifier {
    (importContext: ImportContext, importModuleName: string, localName: string, exportedName?: string, isDefault?: boolean, isNamespace?: boolean): Promise<void>;
}

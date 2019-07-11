import { namedTypes } from 'ast-types/gen/namedTypes';
import EntityCore from "classModel/lib/src/entityCore";
export type ModuleSpecifier = string;
import { Connection } from 'typeorm';
import { Logger } from 'winston';
import {RestClient} from './RestClient';

export interface PromiseResult<T> {
  id: string;
  success: boolean;
  hasResult: boolean;
  result?: T;
  error?: Error;
}

export interface Args<T> {
    connection: Connection;
    restClient: RestClient;
    logger: Logger;
    caller?: T;
}

export interface HandleAst {
    (args: Args<any>, project: EntityCore.Project,fname: string,ast: namedTypes.File): Promise<void>;
}

export interface ImportContext {
    module: ModuleSpecifier;
    moduleEntity: EntityCore.Module;
}

export interface HandleImportSpecifier {
    (importContext: ImportContext, importModuleName: string, localName: string, exportedName?: string, isDefault?: boolean, isNamespace?: boolean): Promise<void>;
}

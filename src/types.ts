import { namedTypes } from 'ast-types/gen/namedTypes';
import EntityCore from "classModel/lib/src/entityCore";
export type ModuleSpecifier = string;
import { Connection } from 'typeorm';
import { Logger } from 'winston';
import {RestClient} from './RestClient';
import AppError from "./AppError";
import {PromiseResult}from '@heptet/common'
export { PromiseResult } 

export interface MyLeveledLogMethod {
    (message: string, callback: any): void|any;
    (message: string, meta: any, callback: any): void|any;
    (message: string, ...meta: any[]): void|any;
    (infoObject: object): void|any;
}

export interface DebugLogger {
    debug: MyLeveledLogMethod;
}

export interface BasicLogger extends DebugLogger {
}

export type ValueKind = any|any[];
//namedTypes.Node | namedTypes.Node[] | string | Map<string, {}> | Map<string, {}>[];

export interface HandleModuleResult {
}
export interface HandleModulePromiseResult extends PromiseResult<HandleModuleResult>  {
}

export interface Args<T> {
    connection: Connection;
    restClient: RestClient;
    logger: Logger;
}

export interface HandleAst {
    (args: Args<any>, project: EntityCore.Project,fname: string,ast: namedTypes.File): Promise<void>;
}

export interface ImportContext {
    module: ModuleSpecifier;
    moduleEntity: EntityCore.Module;
}

export interface HandleImportSpecifier {
    (importContext: ImportContext, importModuleName: string, localName: string, exportedName?: string, isDefault?: boolean, isNamespace?: boolean): Promise<PromiseResult<EntityCore.Import>>;
}

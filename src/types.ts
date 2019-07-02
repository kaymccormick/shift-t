import { namedTypes } from 'ast-types/gen/namedTypes';
import nodes from 'ast-types/gen/nodes';
import {EntityCore} from "classModel";
export type ModuleSpecifier = string;

export interface HandleAst {
    (connection: Connection, project: EntityCore.Project,fname: string,ast: namedTypes.File): Promise<void>;
}

export interface ImportContext {
    module: ModuleSpecifier;
}

export interface HandleImportSpecifier {
    (importContext: ImportContext, importModuleName: string, localName: string, exportedName?: string, isDefault?: boolean, isNamespace?: boolean): Promise<void>;
}

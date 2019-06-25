export type ModuleSpecifier = string;

export interface ImportContext {
    module: ModuleSpecifier;
}

export interface HandleImportSpecifier {
    (importContext: ImportContext, importModuleName: string, localName: string, exportedName?: string, isDefault?: boolean, isNamespace?: boolean): void;
}

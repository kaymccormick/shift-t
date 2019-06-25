export type ModuleSpecifier = string;

export interface ImportContext {
    module: ModuleSpecifier;
}

export interface HandleImportSpecifier {
    (importContext: ImportContext, localName: string, importName: string, isDefault?: boolean, isNamespace?: boolean): void;
}

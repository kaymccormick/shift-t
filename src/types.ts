import {List, Map} from 'immutable';
import {Module} from "./Module";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export  interface GetRegistryInvocationArgs {

}

export interface PojoBuilder<T> {
    toPojo(): T;
}
export interface ModuleClassPojo {
    name: string;
    moduleKey?: string;
    superSpec?: ReferencePojo;
    methods: Map<string, MethodPojo>;
    moduleName?: string;
}

export interface TypePojo {
    nodeType: string;
    tree: {};

}

export interface ParameterPojo {
    name: string;
    type?: TypePojo;
}
export interface ExportPojo {
    name?: string;
    localName?: string;
    isDefaultExport?: boolean;
}
export interface ReferencePojo {
    name: string;
    property?: string;

}

export interface ImportPojo {
    name: string;
    sourceModule: string;
    isDefaultImport: boolean;
    isNamespaceImport: boolean;
}

export interface ModulePojo {
    name: string;
    key: string;
    classes: Map<string, ModuleClassPojo>;
    exports: Map<string, ExportPojo>;
    imports: Map<string, ImportPojo>;
    references: Map<string, ReferencePojo>;
}

export interface Initializable {
    init(): void;
}

export type ModuleMap = Map<string, Module>;

export interface GetModuleFunction {
    (key: string, name: string, create?: boolean): Module;
}
export interface RegistryBase {
    getModule: GetModuleFunction;
    getModuleByName(name: string): Module | undefined;
    setModule(key: string, module: Module): void;
}

/* How does Registry differ from SimpleDataRegistry? */
export interface Registry extends Initializable , RegistryBase{
    /**
     * @deprecated
     */
    modules: ModuleMap;
    save(): void;
}

export interface MethodPojo {
    name: string;
    parameters: List<ParameterPojo>;
}
export interface SimpleRegistryPojo {
    runId?: number;
    modules: Map<string, ModulePojo>;
    moduleKeys: Map<string, string>;
}

export interface SimpleRegistryData extends RegistryBase {
    moduleNames: Map<string, string>;
    moduleKeys: Map<string, string>;
    runId?: number;
    /**
     * @deprecated
     */
    modules: Map<string, Module>;

    getModuleKey(moduleName: string): string;


    getModuleByName(name: string): Module | undefined;

    setModule(moduleKey: string, module: Module): void;
}

import {Map} from 'immutable';
import {Module} from "./Module";
import {ModuleMap} from "./Registry";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export  interface GetRegistryInvocationArgs {

}

export interface PojoBuilder<T> {
    toPojo(): T;
}
export interface ModuleClassPojo {
    name: string;
    superSpec?: (string|string[]);
    methods: Map<string, MethodPojo>;
}

export interface TypePojo {
    nodeType: string;

}

export interface ParameterPojo {
    name: string;
    type: TypePojo;
}
export interface ExportPojo {
    name: string;
}
export interface ReferencePojo {
    name: string;
    property?: string;

}

export interface ImportPojo {
    name: string;
    sourceModule: string;
    isDefaultImport: boolean;
}

export interface ModulePojo {
    name: string;
    classes: Map<string, ModuleClassPojo>;
    exports: Map<string, ExportPojo>;
    imports: Map<string, ImportPojo>;
    references: Map<string, ReferencePojo>;
}

export interface Registry {
    init(): void;

    registerModule(module: Module): void;

    registerClass(classKind: string): void;

    getModule(name: string, create?: boolean): Module;

    modules: ModuleMap;
}

export interface MethodPojo {
    name: string;
}

import {List, Map} from 'immutable';
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
    superSpec?: ReferencePojo;
    methods: Map<string, MethodPojo>;
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

export interface Initializable {
    init(): void;
}

export interface Registry extends Initializable {
    modules: ModuleMap;

    registerModule(module: Module): void;

    registerClass(classKind: string): void;

    getModule(name: string, create?: boolean): Module;

    save(): void;
}

export interface MethodPojo {
    name: string;
    parameters: List<ParameterPojo>;
}

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
    superSpec?: string[];
}
export interface ExportPojo {
    name: string;
}
export interface ReferencePojo {
    name: string;

}
export interface ModulePojo {
    name: string;
    classes: Map<string, ModuleClassPojo>;
    exports: Map<string, ExportPojo>;
    references: Map<string, ReferencePojo>;
}

export interface Registry {
    init(): void;

    registerModule(module: Module): void;

    registerClass(classKind: string): void;

    getModule(name: string, create?: boolean): Module;

    modules: ModuleMap;
}

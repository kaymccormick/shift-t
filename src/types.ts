import { Map } from 'immutable';

interface GetRegistryInvokationArgs {

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
export interface ModulePojo {
    name: string;
    classes: Map<string, ModuleClassPojo>;
    exports: Map<string, ExportPojo>;
}

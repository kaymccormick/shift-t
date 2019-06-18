import { Map } from 'immutable';

export interface PojoBuilder<T> {
    toPojo(): T;
}
export interface ModuleClassPojo {
    name: string;
}
export interface ExportPojo {
    name: string;
}
export interface ModulePojo {
    name: string;
    classes: Map<string, ModuleClassPojo>;
    exports: Map<string, ExportPojo>;
}

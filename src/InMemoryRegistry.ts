import {Module, Registry} from "classModel/lib/src";
import { Map } from 'immutable';

export class InMemoryRegistry implements Registry {
    public getModuleKey(name: string): string {
        return name;
    }
    public modules: Map<string, Module> = Map<string, Module>();

    public getModule(moduleKey: string, moduleName: string, create?: boolean): Module | undefined{
        if (this.modules.has(moduleKey)) {
            const r = this.modules.get(moduleKey);
            if (r) {
                return r;
            }
        }
        if (create) {
            const r = new Module(moduleKey, moduleName);
            this.modules = this.modules.set(moduleKey, r);
            return r;
        }
        throw new Error(`No such module ${moduleKey}`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public getModuleByName(name: string): Module | undefined {

        return undefined;
    }

    public init(): void {
    }

    public save(): void {
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public setModule(key: string, module: Module): void {
    }

}

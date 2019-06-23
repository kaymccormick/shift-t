import {SimpleRegistryData} from "./types";
import {Map} from "immutable";
import {Module} from "./Module";
import upath from "upath";

export class SimpleRegistryDataImpl implements SimpleRegistryData {
    public moduleKeys: Map<string, string> = Map<string, string>();
    public moduleNames: Map<string, string> = Map<string, string>();

    public getModuleByName(name: string): Module | undefined {
        if (!this.moduleNames.has(name)) {
            return undefined;
        }
        const x = this.moduleNames.get(name);
        if (x === undefined) {
            return undefined;
        }
        return this.modules.get(x);
    }


    public getModule(moduleKey: string, moduleName: string, createModule: boolean = false): Module | never {
        if (this.modules.has(moduleKey)) {
            const r = this.modules.get(moduleKey);
            if (r) {
                return r;
            }
        }
        if (createModule) {
            const r = new Module(moduleKey, moduleName);
            this.modules = this.modules.set(moduleKey, r);
            return r;
        }
        throw new Error(`No such module ${moduleKey}`);
    }

    public getModuleKey(moduleName: string): string {
        if (this.moduleNames.has(moduleName)) {
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return this.moduleNames.get(moduleName)!;
        }
        const fileName = upath.basename(moduleName, '.ts');
        const dirName = upath.dirname(moduleName);
        const parsedPath = upath.parse(moduleName);
        const parts = dirName.split(upath.sep);
        let testKey = fileName;
        testKey = parts.pop() + upath.sep + testKey;
        while (this.moduleKeys.has(testKey) && parts.length) {
            testKey = parts.pop() + upath.sep + testKey;
        }
        if (this.moduleKeys.has(testKey)) {
            throw new Error('Unable to generate key');
        }
        this.moduleKeys = this.moduleKeys.set(testKey, moduleName);
        this.moduleNames = this.moduleNames.set(moduleName, testKey);
        return testKey;
    }

    public get modules(): Map<string, Module> {
        return this._modules;
    }

    public set modules(value: Map<string, Module>) {
        this._modules = value;
    }

    private _modules: Map<string, Module> = Map<string, Module>();
    public runId?: number;

    public constructor(runId: number) {
        this.runId = runId;
    }

    public setModule(moduleKey: string, module: Module): void {
        this.modules.set(moduleKey, module);
    }
}

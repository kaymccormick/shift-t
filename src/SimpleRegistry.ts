import {ModuleMap, ModulePojo, Registry, SimpleRegistryData, SimpleRegistryPojo} from "./types";
import {SimpleRegistryDataImpl} from "./SimpleDataRegistryImpl";
import {Module} from "./Module";
import {Map} from "immutable";
import * as fs from "fs";

interface SimpleRegistryArgs {
    runId?: number;
    load?: boolean;
}

export class SimpleRegistry implements Registry {
    private runId?: number;
    private dataImpl = new SimpleRegistryDataImpl(0);
    private data: SimpleRegistryData = this.dataImpl;
    private load: boolean = false;

    public getModuleByName(name: string): Module | undefined {
        return this.data.getModuleByName(name);
    }

    public get modules(): ModuleMap {
        return this.data.modules;
    }

    public set modules(newVal: ModuleMap) {
        this.data.modules = newVal;
    }

    public loadData(value: SimpleRegistryPojo): void {
        this.data = new SimpleRegistryDataImpl(process.pid);
        this.data.modules = Map<string, ModulePojo>(value.modules)
            .map((v) => Module.fromPojo(v));
        this.data.moduleKeys = Map<string, string>(value.moduleKeys);
        this.data.moduleNames = this.data.moduleKeys.mapEntries((entry) => [entry[1], entry[0]]);

    }

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    public init(): void {
        const data: SimpleRegistryPojo = JSON.parse(fs.readFileSync('registry.json', {encoding: 'utf-8'}));
        this.loadData(data);
        if (!this.load && (data.runId === undefined
            || data.runId !== this.runId)) {
            console.log('resetting data');
            this.initBareData();
        }

    }

    public registerClass(classKind: string): void {
        throw new Error("Method not implemented.");
    }

    // private modules: Map<string, Module> = Map<string, Module>();

    public constructor(args: SimpleRegistryArgs) {
        this.runId = args.runId;
        this.load = args.load || false;

    }

    public getModule(key: string, name: string, create: boolean = false): Module {
        return this.data.getModule(key, name, create);
    }

    public getModuleKey(name: string) {
        return this.data.getModuleKey(name);
    }

    private initBareData() {
        this.data = new SimpleRegistryDataImpl(process.pid);
    }

    public save() {
        const modules = this.data.modules.map<ModulePojo>((v) => {
            if (!v.toPojo) {
                throw new Error('no pojo');
            }
            return v.toPojo();
        }).toJS();
        const data = {
            runId: this.data.runId,
            moduleKeys: this.data.moduleKeys,
            modules
        };
        let x;
        try {
            const x = JSON.stringify(data, null, 4);
            fs.writeFileSync('registry.json', x, 'utf-8');
        } catch (error) {
            console.log(error);
        }
    }

    public setModule(key: string, module: Module): void {
    this.data.setModule(key, module);
    }
}

import * as fs from 'fs';
import { CreateModuleFunction, createModule} from './Factory';
import {Module} from "./Module";
import { Map } from 'immutable';
interface Registry {
    init(): void;
    registerModule(module: Module): void;
    registerClass(classKind: string): void;
    getModule(name: string, create?: boolean): Module;
}

interface SimpleRegistryArgs {
    runId: number;
}

interface SimpleRegistryData {
    runId: number;
    modules: Map<string, Module>;
}

export class SimpleRegistry implements Registry {
    private runId: number;
    private data: SimpleRegistryData;

    public init() {
        const data = JSON.parse(fs.readFileSync('registry.json', {encoding: 'utf-8'}));
        this.data = data;
        if (data.runID === undefined || data.runId !== this.runId) {
            this.initBareData();
        }

    }

    registerClass(classKind: string): void {
        throw new Error("Method not implemented.");
    }

    private modules: Map<string, Module> = Map<string, Module>();

    constructor(args: SimpleRegistryArgs) {
        this.runId = args.runId;

    }

    public registerModule(module: Module) {
    }

    public getModule(name: string, create: boolean = false) {
        if(this.data.modules.has(name)) {
            return this.data.modules.get(name);
        } else if(create) {
            this.data.modules = this.data.modules.set(name, createModule(name));
            return this.data.modules.get(name);
        }else {
            throw new Error(`nonexistent module ${name}`)
        }
    }

    private initBareData() {
        this.data = {modules: Map<string, Module>(), runId: this.runId};
    }

    public save() {
        console.log(this.data);
        fs.writeFileSync('registry.json', JSON.stringify(this.data), 'utf-8');
    }
}

import * as fs from 'fs';
import { CreateModuleFunction, createModule} from './Factory';
import {Module, ModulePojo} from "./Module";
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
        const data: SimpleRegistryData = JSON.parse(fs.readFileSync('registry.json', {encoding: 'utf-8'}));
        this.data = data;
        this.data.modules = Map(this.data.modules);
        if (data.runId === undefined || data.runId !== this.runId) {
        console.log('resetting data');
            this.initBareData();
        }

    }

    registerClass(classKind: string): void {
        throw new Error("Method not implemented.");
    }

   // private modules: Map<string, Module> = Map<string, Module>();

    public constructor(args: SimpleRegistryArgs) {
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
//        console.log(this.data);
        //console.log(this.data.modules.toJSON());
const modules = this.data.modules.map<ModulePojo>((v) => v.toPojo !== undefined ? v.toPojo(): v).toJS();
        this.data.modules.forEach((v, k) => {
            //console.log(v);
            //console.log(v.toPojo())
        });
        //const modules = {}
        //const modules = this.data.modules.map((v) => v.toPojo()).toJS();
        const data = { runId: this.data.runId,
        modules };
        fs.writeFileSync('registry.json', JSON.stringify(data, null, 4), 'utf-8');
    }
}

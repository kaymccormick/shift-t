import * as fs from 'fs';
import { CreateModuleFunction, createModule} from './Factory';
import {Module} from "./Module";
import { Map } from 'immutable';
import {ModulePojo} from "./types";
export interface Registry {
    init(): void;
    registerModule(module: Module): void;
    registerClass(classKind: string): void;
    getModule(name: string, create?: boolean): Module;
}

interface SimpleRegistryArgs {
    runId?: number;
    load?: boolean;
}

interface SimpleRegistryPojo {
    runId?: number;
    modules: Map<string, ModulePojo>;
}

interface SimpleRegistryData {
    runId?: number;
    modules: Map<string, Module>;
}

class SimpleRegistryDataImpl implements SimpleRegistryData {
    public modules: Map<string, Module> = Map<string, Module>();
    public runId?: number;

    public constructor(runId: number) {
        this.runId = runId;
    }
}

export class SimpleRegistry implements Registry {
    private runId?: number;
    private data: SimpleRegistryData = new SimpleRegistryDataImpl(0);
    private load: boolean = false;

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    public init(): void {
        const data: SimpleRegistryPojo = JSON.parse(fs.readFileSync('registry.json', {encoding: 'utf-8'}));
        const modules2 = Map<string, ModulePojo>(data.modules);
        this.data = { runId: data.runId,
        modules: modules2.map((v: ModulePojo): Module => Module.fromPojo(v)),
        };

        if (!this.load && (data.runId === undefined || data.runId !== this.runId)) {
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

    public registerModule(module: Module) {
    }

    public getModule(name: string, create: boolean = false): Module {
        if(this.data.modules.has(name)) {
            const newVar = this.data.modules.get(name);
            if(!newVar) {
                throw new Error('undefined module');
            }
            return newVar
        } else if(create) {
            const module = createModule(name);
            this.data.modules = this.data.modules.set(name, module);
            return module;
        }else {
            throw new Error(`nonexistent module ${name}`)
        }
    }

    private initBareData() {
        this.data = {modules: Map<string, Module>(), runId: this.runId};
    }

    public save() {
        const modules = this.data.modules.map<ModulePojo>((v) => {
            if(!v.toPojo) {
                throw new Error('no pojo');
            }
            return v.toPojo();
        }).toJS();
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

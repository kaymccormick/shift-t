import * as fs from 'fs';
import {createModule} from './Factory';
import {Module} from "./Module";
import {Map} from 'immutable';
import {ModulePojo, Registry} from "./types";

export type ModuleMap = Map<string, Module>;

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
}

export class SimpleRegistry implements Registry {
    private runId?: number;
    private dataImpl = new SimpleRegistryDataImpl(0);
    private data: SimpleRegistryData = this.dataImpl;
    private load: boolean = false;

    public get modules(): ModuleMap { return this.data.modules; }
    public set modules(newVal: ModuleMap) { this.data.modules = newVal; }

    public loadData( value: SimpleRegistryPojo): void {
        this.data = {
       		 runId: value.runId,
 		 modules: Map<string, ModulePojo>(value.modules)
		 	  .map((v) => Module.fromPojo(v)),
        };
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
        const data = { runId: this.data.runId,
            modules };
	    let x;
	    try {
	    const x = JSON.stringify(data, null, 4);
            fs.writeFileSync('registry.json', x, 'utf-8');
        } catch(error) {
            console.log(error);
        }
    }
}

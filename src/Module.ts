import {ModuleClass} from "./ModuleClass";
import {Map} from "immutable";
import {Import, ImportPojo} from "./Import";

export interface ModulePojo {
    name: string;
    imports: Map<string, ImportPojo>;
}

class Module {
    public name: string;
    public imports: Map<string, Import> = Map({});
    public classes: Map<string, ModuleClass> = Map({});
    public exported: {};
    public defaultExport: undefined | string;

    public constructor(name: string) {
        if (!name) {
            throw new Error('must have a name');
        }
        this.name = name;
        this.exported = {};
        this.defaultExport = undefined;
    }

    public setImports(imports): void {
        this.imports = Map(imports);
    }

    public toPojo(): ModulePojo {
        const c = {};
        const e = {};

        // Object.keys(this.exported).forEach(k => {
        //     e[k] = this.exported[k].toPojo();
        // });
        // Object.keys(this.classes).forEach(cn => {
        //     const v = this.classes[cn];
        //     c[cn] = v.toPojo();
        // });
        // const returnVal: ModulePojo =

        return {
            //imported: this.imported,
            imports: this.imports.toJS(),
            //exported: e,
            name: this.name,
            classes: c,
            defaultExport: this.defaultExport
        };
    }

    public getClass(name: any): ModuleClass {
        if (Object.prototype.hasOwnProperty.call(this.classes, name)) {
            return this.classes[name];
        }
        this.classes[name] = new ModuleClass(this);
        return this.classes[name];
    }

    public getImportedName(name: string) {
        if (Object.prototype.hasOwnProperty.call(this.imported, name)) {
            return this.imported[name];
        }
        throw new Error(`no such imported name ${name}`);
    }
    public addImport(name: string, module: string, defaultImport: boolean = false) {
        this.imports = this.imports.set(name, new Import(name, module, defaultImport));
    }
    public toString(): string {
        return this.name;
    }

}

export {Module};

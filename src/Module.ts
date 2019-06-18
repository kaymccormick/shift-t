import {ModuleClass} from "./ModuleClass";
import {Map} from 'immutable';
import {ExportPojo, ModuleClassPojo, ModulePojo} from "./types";
import {Export} from "./Export";

interface ExportArgs {
    localName: string;
    exportName: string;

}

class Module {
    public name: string;
    public classes: Map<string, ModuleClass> = Map<string, ModuleClass>();
    public exports: Map<string, Export> = Map<string, Export>();
    public  imported: {};
    public  defaultExport: undefined | string;

    public constructor(name: string) {
        this.name = name;
        this.imported = {};
        this.defaultExport = undefined;
    }

    public addExport(args: ExportArgs) {
        this.exports = this.exports.set(args.localName, new Export(args.exportName));
    }

    public getClassNames(): string[] {
        return Object.keys(this.classes);
    }

    public toPojo(): ModulePojo {
        // const c = {};
        // const e = {};
        // Object.keys(this.exported).forEach(k => {
        //     e[k] = this.exported[k].toPojo();
        // });
        // Object.keys(this.classes).forEach(cn => {
        //     const v = this.classes[cn];
        //     if(v.toPojo) {
        //         c[cn] = v.toPojo();
        //     } else {
        //         throw new Error('NoPojo');
        //     }
        // });
        // return {
        //     imported: this.imported,
        //     exported: e,
        //     name: this.name,
        //     classes: c,
        //     defaultExport: this.defaultExport
        // };
        const m: ModulePojo = {
            name: this.name,
            exports: this.exports.map((c: Export): ExportPojo => c.toPojo()),
            classes: this.classes.map((c: ModuleClass): ModuleClassPojo => c.toPojo()),

        };
        return m;
    }

    public getClass(name: any, createClass: boolean = false): ModuleClass {
        if(this.classes.has(name)) {
            const newVar = this.classes.get(name);
            if(newVar === undefined) {
                throw new Error('undefined class');
            }
            return newVar;
        } else if(createClass) {
            const c = new ModuleClass(name);
            this.classes.set(name, c);
            return c;
        } else {
            throw new Error('no such class');
        }
    }

    public toString(): string {
        return this.name;
    }

    public addImport(name: string, full: string, isDefault?: boolean): void {

    }

    public static fromPojo(v: ModulePojo) {
        const module1 = new Module(v.name);
        module1.exports = Map<string, ExportPojo>(v.exports).map((v: ExportPojo): Export => Export.fromPojo(v));
        return module1;
    }
}
export { Module };

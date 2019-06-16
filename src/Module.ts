import {ModuleClass} from "./ModuleClass";

class Module {
    name: string;
    public classes: { [className: string]: ModuleClass };
    public  exported: {};
    public  imported: {};
    public  defaultExport: undefined | string;

    constructor(name: string) {
        this.name = name;
        this.imported = {};
        this.exported = {};
        this.classes = {};
        this.defaultExport = undefined;
    }

    getClassNames(): string[] {
      return Object.keys(this.classes);
    }

    toPojo() {
        const c = {};
        const e = {};
        Object.keys(this.exported).forEach(k => {
            e[k] = this.exported[k].toPojo();
        });
        Object.keys(this.classes).forEach(cn => {
            const v = this.classes[cn];
            c[cn] = v.toPojo();
        });
        return {
            imported: this.imported,
            exported: e,
            name: this.name,
            classes: c,
            defaultExport: this.defaultExport
        };
    }

    getClass(name: any): ModuleClass {
        if(Object.prototype.hasOwnProperty.call(this.classes, name)) {
            return this.classes[name];
        }
        this.classes[name] = new ModuleClass(this);
        return this.classes[name];
    }

    getImportedName(name: string) {
        if(Object.prototype.hasOwnProperty.call(this.imported, name)) {
            return this.imported[name];
        }
        throw new Error(`no such imported name ${name}`);
    }
    toString(): string {
        return this.name;
    }

}
export { Module };

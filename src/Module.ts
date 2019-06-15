class Module {
    name: string;
    public classes: {};
    public  exported: {};
    public  imported: {};
    public  defaultExport: undefined | string;

    constructor(name: string) {
        this.name = name;
        this.imported = {}
        this.exported = {}
        this.classes = {}
        this.defaultExport = undefined;
    }

    toPojo() {
        return { imported: this.imported, exported: this.exported, name: this.name, classes: this.classes, defaultExport: this.defaultExport };
    }
}
export { Module };

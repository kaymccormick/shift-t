import {ExportPojo} from "./types";

class Export {
    public name?: string;
    public isDefaultExport?: boolean;
    public localName?: string;

    public constructor(localName: string|undefined, name: string | undefined, isDefaultExport: boolean | undefined) {
        this.name = name;
        this.isDefaultExport = isDefaultExport;
        this.localName = localName;
    }

    public toPojo(): ExportPojo {
        return { name: this.name,
            localName: this.localName,
            isDefaultExport: this.isDefaultExport };
    }

    public static fromPojo(v: ExportPojo) {
        return new Export(v.localName, v.name, v.isDefaultExport);
    }
}
export { Export };

import {PojoBuilder} from "./types";

export interface ImportPojo {
    name: string;
    sourceModule: string;
    isDefaultImport: boolean;
}

export class Import implements PojoBuilder<ImportPojo> {
    public name: string;
    public sourceModule: string;
    public isDefaultImport: boolean;

    public constructor(name: string, sourceModule: string, isDefaultImport: boolean) {
        this.name = name;
        this.sourceModule = sourceModule;
        this.isDefaultImport = isDefaultImport;
    }

    public toPojo(): ImportPojo {
        return this;
    }
}

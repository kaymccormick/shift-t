import {ImportPojo, PojoBuilder} from "./types";

export class Import implements PojoBuilder<ImportPojo> {
    public name: string;
    public sourceModule: string;
    public isDefaultImport: boolean;
    public isNamespaceImport: boolean;

    public constructor(name: string, sourceModule: string, isDefaultImport: boolean, isNamespaceImport: boolean) {
        this.name = name;
        this.sourceModule = sourceModule;
        this.isDefaultImport = isDefaultImport;
        this.isNamespaceImport = isNamespaceImport;
    }

    public toPojo(): ImportPojo {
        return this;
    }

    public static fromPojo(v: ImportPojo): Import {
        return new Import(v.name, v.sourceModule, v.isDefaultImport, v.isNamespaceImport);

    }
}

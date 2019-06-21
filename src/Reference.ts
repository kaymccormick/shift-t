import {Module} from "./Module";
import {PojoBuilder, ReferencePojo} from "./types";

interface MapKey {
    readonly key: string;
}

export class Reference implements PojoBuilder<ReferencePojo>, MapKey {
    public module?: Module;
    public name?: string;
    public property?: string;
    public get key(): string {
        if(this.name === undefined) {
            throw new Error('');
        }
        return this.name;
    }

    public constructor(name?: string, module?: Module) {
        this.name = name;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.module = module;
    }

    public toString(): string {
        return `<Reference ${this.name}>`;
    }
    public toPojo(): ReferencePojo {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return { name: this.name!,
        property: this.property};
    }

    public static fromPojo(v: ReferencePojo): Reference {
        return new Reference(v.name);
    }
}

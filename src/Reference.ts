import {Module} from "./Module";
import {PojoBuilder, ReferencePojo} from "./types";

export class Reference implements PojoBuilder<ReferencePojo> {
    public module: Module;
    public name?: string;

    public constructor(module: Module) {
        this.module = module;
    }

    public toPojo(): ReferencePojo {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return { name: this.name! };
    }
}

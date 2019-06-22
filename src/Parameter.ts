import {ParameterPojo, PojoBuilder} from "./types";
import {Type} from "./Type";

export class Parameter implements PojoBuilder<ParameterPojo> {
    public name: string;
    public type: Type|undefined;

    public constructor(name: string, type: Type|undefined) {
        this.name = name;
        this.type = type;
    }

    public toPojo(): ParameterPojo {
        const r: ParameterPojo = { name: this.name }
        if(this.type !== undefined) {
            r.type = this.type.toPojo();
        }
        return r;
	}

    public static fromPojo(v: ParameterPojo) {
        return new Parameter(v.name, v.type ? Type.fromPojo(v.type) : undefined)
    }
}


import {ParameterPojo, PojoBuilder} from "./types";
import {Type} from "./Type";

export class Parameter implements PojoBuilder<ParameterPojo> {
    public name: string;
    public type: Type;

    public constructor(name: string, type: Type) {
        this.name = name;
        this.type = type;
    }

    public toPojo(): ParameterPojo {
        return { name: this.name, type: this.type.toPojo() };;
    }

    public static fromPojo(v: ParameterPojo) {
        return new Parameter(v.name, Type.fromPojo(v.type))
    }
}) {}

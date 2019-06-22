import {MethodPojo, ParameterPojo, PojoBuilder} from "./types";
import {Parameter} from "./Parameter";
import {List} from "immutable";
import {Type} from "./Type";
import * as kinds from 'ast-types/gen/kinds'
export class Method implements PojoBuilder<MethodPojo> {
    public addParamNode(pk: kinds.PatternKind) {
        throw new Error(pk.type);
        throw new Error("Method not implemented.");
    }
    public addParam(name: string, type_?: Type) {
        this.parameters = this.parameters.push(new Parameter(name, type_));
    }
    public name: string;
    public parameters: List<Parameter> = List<Parameter>();

    public constructor(name: string) {
        this.name = name;
    }

    public toPojo(): MethodPojo {
        return {name: this.name,
            parameters: this.parameters.map((p: Parameter) => p.toPojo()),
        };
    }

    public  static fromPojo(v: MethodPojo): Method {
        const method = new Method(v.name);
        if(v.parameters) {
            method.parameters = v.parameters.map((v: ParameterPojo): Parameter => Parameter.fromPojo(v));
        }
        return method;
    }
}

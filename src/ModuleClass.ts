import {MethodPojo, ModuleClassPojo} from "./types";
import {Reference} from "./Reference";
import {Method} from "./Method";
import { Map } from 'immutable';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SuperClassSpecification {

}

export class SuperClassSpecifier implements SuperClassSpecification {
    public     constructor(objectName: string, propertyName: string) {

    }


}
class ModuleClass {
    public readonly name: string;
    public superSpec?: Reference;
    public methods: Map<string, Method> = Map<string, Method>();;
    public constructor(name: string, superSpec?: Reference) {
        this.name = name;
        this.superSpec = superSpec;
    }
    public toPojo(): ModuleClassPojo {
        const r: ModuleClassPojo = { name: this.name,
            methods: this.methods.map((v: Method): MethodPojo => v.toPojo()),
        };
        if(this.superSpec !== undefined) {
            r.superSpec = this.superSpec.name;
        }
        return r;
    }

    public static fromPojo(v: ModuleClassPojo): ModuleClass|never {
        if(!Array.isArray(v.superSpec)) {
            const moduleClass = new ModuleClass(v.name, new Reference(v.superSpec));
            moduleClass.methods = Map<string, MethodPojo>(v.methods).map((v: MethodPojo): Method => Method.fromPojo(v));
            return moduleClass;
        }
        throw new Error('');
    }

    public getMethod(methodName: string, create: boolean = false): Method {
        if (this.methods.has(methodName)) {
            const newVar = this.methods.get(methodName);
            if (newVar === undefined) {
                throw new Error('undefined');
            }
            return newVar;
        } else if (create) {
            const newVar = new Method(methodName);
            this.methods = this.methods.set(methodName, newVar);
            return newVar;
        } else {
            throw new Error(`No such method ${methodName}`);
        }
    }
}

// @ts-ignore
export { ModuleClass };


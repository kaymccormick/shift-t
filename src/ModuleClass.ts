import {ModuleClassPojo} from "./types";

export interface SuperClassSpecification {

}

export class SuperClassSpecifier implements SuperClassSpecification {
public     constructor(objectName: string, propertyName: string) {

    }


}
class ModuleClass {
    public readonly name: string;
    public superSpec?: SuperClassSpecification;
    public constructor(name: string, superSpec?: string[]) {
        this.name = name;
        this.superSpec = superSpec;
    }
    public toPojo(): ModuleClassPojo {
        return {
            name: this.name,
            superSpec: this.superSpec,
        }
    }
}

// @ts-ignore
export { ModuleClass };


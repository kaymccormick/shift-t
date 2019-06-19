import {ModuleClassPojo} from "./types";

class ModuleClass {
    public readonly name: string;
    public superSpec?: string[];
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


import {ModuleClassPojo} from "./types";

class ModuleClass {
    public readonly name: string;
    public constructor(name: string) {
        this.name = name;
    }
    public toPojo(): ModuleClassPojo {
        return {
            name: this.name,
        }
    }
}

// @ts-ignore
export { ModuleClass };


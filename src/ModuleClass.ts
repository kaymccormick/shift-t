import {Module} from "./Module";

class ModuleClass {
name: string;
module: Module;
    constructor(module: Module) {
        this.module = module;
    }
    toPojo() {
        return { module: this.module.name }
    }
}

export { ModuleClass };


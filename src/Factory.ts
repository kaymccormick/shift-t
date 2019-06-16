import {Module} from "./Module";

export interface CreateModuleFunction {
  (name: string): Module;
}

function createModule(name: string): Module {
  return new Module(name);
}

export { createModule };

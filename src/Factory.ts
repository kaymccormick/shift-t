import {Module} from "./Module";

export interface CreateModuleFunction {
  (name: string): Module;
}

function createModule(key: string, name: string): Module {
  return new Module(key, name);
}

export { createModule };

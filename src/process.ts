import * as fs from 'fs';

import { SimpleRegistry} from './Registry';
import {Registry} from "./types";

const registry = new SimpleRegistry({ load: true}) as Registry;
registry.init();
registry.modules.forEach((module) => {
    module.classes.forEach(moduleClass => {
       console.log(moduleClass.name);

    });
console.log(module.name);
})

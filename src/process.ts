import * as fs from 'fs';

import { SimpleRegistry, Registry } from './Registry';

const registry = new SimpleRegistry({ load: true}) as Registry;
registry.init();
registry.modules.forEach((module) => {
    module.classes.forEach(moduleClass => {
       console.log(moduleClass.name);
       moduleClass.
    });
console.log(module.name);
})

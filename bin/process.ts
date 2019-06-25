import {Map} from 'immutable';
import {Module, Registry, Import, Export} from "classModel/lib/src";
import {ModuleClass} from "classModel/lib/src/ModuleClass";
import {processRegistry} from "classModel/lib/src/RegistryUtils";
import {createRegistry} from "../src/InMemory/Factory";

let classMap: Map<string, ModuleClass> = Map();

const registry = createRegistry();
if(!registry) {
    throw new Error('');//process.exit(1);
}

/*registry.modules.forEach((module) => {
    module.classes.forEach(moduleClass => {
        if(classMap.has(moduleClass.name)) {
            const origClass = classMap.get(moduleClass.name)
            if (origClass) {
                throw new Error(`${module.name}: duplicate class name ${moduleClass.name} in ${origClass.moduleKey}`);
            }
        }
	console.log(`storing ${moduleClass.name}`);
        classMap = classMap.set(moduleClass.name, moduleClass);
    });
});
*/
processRegistry(registry);
const sm = registry.modules.get('/local/home/jade/JsDev/docutils-t/src/StateMachineWS');
if(sm) {
    const ws = sm.classes.get('StateMachineWS');
    if(ws) {
        console.log(ws.superSpec);
    }
}
//process.exit(0);
registry.modules.forEach((module: Module) => {
    console.log(`module ${module.name}`);
    module.imports.forEach((import1: Import) => {
        console.log(`  import ${import1.localName}`);
    })
    const f = (moduleClass: ModuleClass, i: number = 0): void => {
        console.log(moduleClass.name);
        if(i > 30) {
            throw new Error('iterations');
        }
        if (moduleClass.superSpec) {
            const moduleClass1 = moduleClass.superSpec.moduleClass;
            if (moduleClass1) {
                if (moduleClass1.superSpec && moduleClass1.superSpec.moduleClass) {
                    f(moduleClass1, i + 1);
                }
            }
        }
    };
    // @ts-ignore
    module.classes.forEach(f);
});

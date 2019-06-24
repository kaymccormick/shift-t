import {Registry} from "classModel/lib/types";
import {ModuleClass} from "classModel/lib/ModuleClass";
import {Map} from 'immutable';
import {SimpleRegistry} from "classModel/lib/SimpleRegistry";
import {process} from "classModel/lib/RegistryUtils";

let classMap: Map<string, ModuleClass> = Map();

const registry = new SimpleRegistry({ load: true}) as Registry;
registry.init();

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
process(registry);
const sm = registry.modules.get('/local/home/jade/JsDev/docutils-t/src/StateMachineWS');
if(sm) {
    const ws = sm.classes.get('StateMachineWS');
    if(ws) {
        console.log(ws.superSpec);
    }
}
//process.exit(0);
registry.modules.forEach((module) => {
    console.log(`module ${module.name}`);
    module.imports.forEach(import1 => {
        console.log(`  import ${import1.name}`);
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

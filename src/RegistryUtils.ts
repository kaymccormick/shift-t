export function process(registry) {
    registry.modules.forEach((module) => {
        console.log(`module ${module.name}`);
        module.imports.forEach(import1 => {
            console.log(`  import ${import1.name}`);
        })
        module.classes.forEach(moduleClass => {
            console.log(`  class ${moduleClass.name}`);
            ;
            if (moduleClass.superSpec !== undefined) {
                const className = moduleClass.superSpec.name;
                if (className === undefined) {
                    throw new Error('');
                }
                const newVar = module.references.get(moduleClass.superSpec.key);
                if (newVar === undefined) {
                    throw new Error('');
                }
                console.log(`    superClass ${className} ${newVar}`);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const key = newVar.name!;
                if (newVar.property) {
                    console.log(newVar.property);
                    //new Error(newVar.property);
                }
                if (key === 'Array' || key === 'Error') {

                } else {
                    const import1 = module.imports.get(key);
                    if (import1 !== undefined) {
                        const module1 = registry.getModuleByName(import1.sourceModule);
                        if (!module1) {
                            throw new Error(`Unable to get module by name ${import1.sourceModule}`);
                        }
                        if (import1.isDefaultImport) {
                            const exp = module1.exports.find((v) => v.isDefaultExport || false);
                            if (exp && exp.localName) {
                                const moduleClass1 = module1.classes.get(exp.localName);
                                moduleClass.superSpec.moduleClass = moduleClass1;
                            }
                        } else {
                            const key1 = newVar.property || key;
                            const newVar2 = module1.exports.get(key1);
                            if (newVar2 && newVar2.name) {
                                const moduleClass1 = module1.classes.get(newVar2.name);
                                if (moduleClass1) {
                                    moduleClass.superSpec.moduleClass = moduleClass;
                                } else {
                                    throw new Error('');
                                }
                            } else {
                                throw new Error(`${module1.name}: ${key1}`);
                            }
                        }
                    } else {
                        const class1 = module.classes.get(key);
                        if (class1 === undefined) {
                            throw new Error('');
                        }
                        moduleClass.superSpec.moduleClass = class1;
                    }

                    if (moduleClass.superSpec.moduleClass === undefined) {
                        throw new Error('');
                    }
                }
                if (moduleClass.superSpec.module !== undefined) {
                    console.log(`    superClass ${moduleClass.superSpec.module.name}`);
                }
            }
            module.classes = module.classes.set(moduleClass.name, moduleClass);
            registry.setModule(module.key, module);
            registry.modules = registry.modules.set(module.name, module);
        });
        console.log(module.name);
    });
}

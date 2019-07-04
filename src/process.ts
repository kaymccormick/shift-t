import {Map, Record, RecordOf} from "immutable"; import {Connection,
    Repository} from "typeorm"; import {EntityCore} from "classModel";
import {namedTypes} from "ast-types/gen/namedTypes";

type ImportMap = Map<string, EntityCore.Import>;

type ResultType = [EntityCore.Module, ImportMap,
    Map<string, EntityCore.Class>, Map<string, EntityCore.Export>,
    Map<string, EntityCore.Name>,
    Map<string, EntityCore.Interface>,
];

interface ModuleProps {
    classes: Map<string, EntityCore.Class>;
    imports: Map<string, EntityCore.Import>;
    exports: Map<string, EntityCore.Export>;
    names: Map<string, EntityCore.Name>;
    module: EntityCore.Module;
    interfaces: Map<string, EntityCore.Interface>;
}

type ModuleRecord = RecordOf<ModuleProps>;

function classes(classRepo: Repository<EntityCore.Class>, module: EntityCore.Module) {
    return classRepo.find({module}).then(classes => {
        const noNames = classes.filter(c => !c.name);
        if (noNames.length > 1) {
            throw new Error('too many unnamed classes');
        }

        if (noNames.length) {
            throw new Error('pop')
        }
        return Map<string, EntityCore.Class>(classes.map(class_ => [class_.name, class_]))
    })//.then(classes => ({
    //     classes,
    //
    // }))
}

function interfaces(interfaceRepo: Repository<EntityCore.Interface>, module: EntityCore.Module) {
    return interfaceRepo.find({module}).then(ifaces => Map<string, EntityCore.Interface>(ifaces.map(iface => [iface.name||'', iface])));
}

function getExports(exportRepo: Repository<EntityCore.Export>, module: EntityCore.Module) {
    return exportRepo.find({module}).then((exports: EntityCore.Export[]) => {
        const defaultExport = exports.find(e => e.isDefaultExport);
        module.defaultExport = defaultExport;
        return Map<string, EntityCore.Export>(exports.filter(export_ => export_.exportedName).map(export_ => [export_.exportedName || '', export_]))
    });
}

function imports(importRepo: Repository<EntityCore.Import>, module: EntityCore.Module) {
    return importRepo.find({where: {module}, relations: ["module"]}).then(imports => {
        const defaultImport = imports.find(i => i.isDefaultImport);

        return Map<string, EntityCore.Import>(imports.map((import_: EntityCore.Import) => [import_.localName, import_]));
    });
}

function handleClass(
    class_: EntityCore.Class,
    module: ModuleRecord,
    modules: Map<string, ModuleRecord>,
    classRepo: Repository<EntityCore.Class>,
    interfaceRepo: Repository<EntityCore.Interface>,
): Promise<EntityCore.Class|undefined> {
    if(class_.implementsNode && class_.implementsNode.length) {
        class_.implementsNode.map((o: namedTypes.TSExpressionWithTypeArguments) => {
            let exportedName;

            if(o.expression.type === 'Identifier') {
                const name = module.names.get(o.expression.name);
                if(name) {
                    console.log(`name is ${name}`);
                    if(name.nameKind === 'import') {
                        const import_ = module.imports.get(o.expression.name);
                        if(import_) {
                            console.log('found import');
                            const sourceModule = modules.get(import_.sourceModuleName);
                            if (sourceModule) {
                                let export_: EntityCore.Export | undefined = undefined;
                                if (import_.isDefaultImport) {
                                    export_ = sourceModule.module.defaultExport;
                                    if(!export_) {
                                        throw new Error(`no default export for ${sourceModule.module.id} ${sourceModule.module.name}`);
                                    }
                                } else {
                                    if(!exportedName){
                                        exportedName = import_.exportedName ||'';
                                    }
                                    export_ = sourceModule.exports.get(exportedName);
                                }
                                if (export_) {
                                    const interface2_ = sourceModule.interfaces.get(exportedName||'');
                                    if (interface2_) {
                                        if(!class_.implements) {
                                            class_.implements = [interface2_];
                                        } else {
                                            class_.implements.push(interface2_);
                                        }
                                        //                                        return classRep.save(class_).then((z) => undefined);
                                    }
                                } else {
                                    throw new Error(`no export`);
                                }
                            }
                        }
                    }
                }
            }

        });
    }
    if (class_.superClassNode) {
        let objectName;
        let exportedName;
        let okay = false;
        if (class_.superClassNode.type === 'MemberExpression') {
            objectName = class_.superClassNode.object.name;
            exportedName = class_.superClassNode.property.name;
        } else {
            objectName = class_.superClassNode.name;
        }
        const name_ = module.names.get(objectName);
        if(name_) {
            if(name_.nameKind === 'class'){
                const c = module.classes.get(objectName);
                class_.superClass = c;
                return classRepo.save(class_);
            }
        }
        /* class might not even be an import! */
        const import_ = module.imports.get(objectName)
        if(!import_) {
            if(objectName === 'Array' || objectName === 'Error') {
                okay = true;
            } else {
                throw new Error(`unable to find import for ${objectName}`);
            }
        }
        if (import_) {
            const sourceModule = modules.get(import_.sourceModuleName);
            if (sourceModule) {
                let export_: EntityCore.Export | undefined = undefined;
                if (import_.isDefaultImport) {
                    export_ = sourceModule.module.defaultExport;
                    //export_ = sourceModule.exports.find((e) => e.isDefaultExport);
                    if(!export_) {
                        throw new Error(`no default export for ${sourceModule.module.id} ${sourceModule.module.name}`);
                    }
                } else {
                    if(!exportedName){
                        exportedName = import_.exportedName ||'';
                    }
                    export_ = sourceModule.exports.get(exportedName);
                }
                if (export_) {
                    const class2_ = sourceModule.classes.get(export_.localName || '');
                    if (class2_) {
                        class_.superClass = class2_;
                        return classRepo.save(class_).then((z) => undefined);
                    }
                } else {
                    throw new Error(`no export`);
                }
            }
        }

        if(!okay) {
            throw new Error(`unable to find superclass for ${class_.name}`);
        }
    }
    return classRepo.save(class_);
}

function getRepositories(connection: Connection) {
    const moduleRepo = connection.getRepository(EntityCore.Module);
    const classRepo = connection.getRepository(EntityCore.Class);
    const importRepo = connection.getRepository(EntityCore.Import);
    const exportRepo = connection.getRepository(EntityCore.Export);
    const nameRepo = connection.getRepository(EntityCore.Name);
    const interfaceRepo = connection.getRepository(EntityCore.Interface);
    return {moduleRepo, classRepo, importRepo, exportRepo, nameRepo, interfaceRepo};
}

function names(nameRepo: Repository<EntityCore.Name>, module: EntityCore.Module) {

    return nameRepo.find({where: {module}}).then((names: EntityCore.Name[])    => Map<string, EntityCore.Name>(names.map(name => [name.name || '', name])));

}

export function doProject(project: EntityCore.Project, connection: Connection) {
    const {moduleRepo, classRepo, importRepo, exportRepo, nameRepo, interfaceRepo} = getRepositories(connection);
    const factory = Record({
        classes: Map<string, EntityCore.Class>(),
        imports: Map<string, EntityCore.Import>(),
        exports: Map<string, EntityCore.Export>(),
        interfaces: Map<string, EntityCore.Interface>(),
        names: Map<string, EntityCore.Name>(),
        module: undefined as unknown as EntityCore.Module
    });
    return moduleRepo.find({where: { project}, relations: ['defaultExport']}).then((modules: EntityCore.Module[]): Promise<any> =>
        Promise.all(modules.map((module): Promise<any> =>
            Promise.all([Promise.resolve(module),
                imports(importRepo, module),
                classes(classRepo, module),
                getExports(exportRepo, module),
                names(nameRepo, module),
                interfaces(interfaceRepo, module),
            ]).then(([module, imports, classes, exports, names, interfaces]: ResultType): any => {
                const r = factory({module, imports, classes, exports, names, interfaces});
                return r;
            }).then((module): Promise<ModuleRecord> => {
                return moduleRepo.save(module.module).then((): ModuleRecord => module)
            }))).then((modules): ModuleRecord[] => {
            return Map<string, ModuleRecord>(modules.map((module: ModuleRecord): [string, ModuleRecord]  => {
                if (module === undefined) {
                    console.log('undefined module');
                    throw new Error('undefined module');
                }
                if (!module.module) {
                    throw new Error('');
                }
                return [module.module.name, module];
            }));
        })).then((modules: Map<string, ModuleRecord>): Promise<any>[] =>
        modules.flatMap((module): Promise<any>[] =>
            module.classes.map((class_): Promise<any> => handleClass(class_, module, modules, classRepo,interfaceRepo).catch((error): void => { console.log(error.message); })).valueSeq().toJS()));
            }

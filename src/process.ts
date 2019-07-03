import {Map, Record, RecordOf} from "immutable";
import {Connection, Repository} from "typeorm";
import {EntityCore} from "classModel";

type ImportMap = Map<string, EntityCore.Import>;

type ResultType = [EntityCore.Module, ImportMap,
    Map<string, EntityCore.Class>, Map<string, EntityCore.Export>,
    Map<string, EntityCore.Name>];

interface ModuleProps {
    classes: Map<string, EntityCore.Class>;
    imports: Map<string, EntityCore.Import>;
    exports: Map<string, EntityCore.Export>;
    names: Map<string, EntityCore.Name>;
    module: EntityCore.Module;
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
) {
    console.log(class_.name);
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
            console.log(`found name kind ${name_.nameKind}`);
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
            console.log(import_.sourceModuleName);
            if (sourceModule) {
                let export_: EntityCore.Export | undefined = undefined;
                if (import_.isDefaultImport) {
                    console.log('useing default export');
                    export_ = sourceModule.module.defaultExport;
                    //export_ = sourceModule.exports.find((e) => e.isDefaultExport);
                    if(!export_) {
                        console.log(`no default export for ${sourceModule.module.id} ${sourceModule.module.name}`);
                    }
                } else {
                    if(!exportedName){
                        exportedName = import_.exportedName ||'';
                    }
                    console.log(`looking up export ${exportedName}`);
                    export_ = sourceModule.exports.get(exportedName);
                }
                console.log(`got ${export_}`);
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
    return Promise.resolve(undefined);
}

function getRepositories(connection: Connection) {
    const moduleRepo = connection.getRepository(EntityCore.Module);
    const classRepo = connection.getRepository(EntityCore.Class);
    const importRepo = connection.getRepository(EntityCore.Import);
    const exportRepo = connection.getRepository(EntityCore.Export);
    const nameRepo = connection.getRepository(EntityCore.Name);
    return {moduleRepo, classRepo, importRepo, exportRepo, nameRepo};
}

function names(nameRepo: Repository<EntityCore.Name>, module: EntityCore.Module) {

    return nameRepo.find({where: {module}}).then((names: EntityCore.Name[])    => Map<string, EntityCore.Name>(names.map(name => [name.name || '', name])));

}

export function doProject(project: EntityCore.Project, connection: Connection) {
    console.log(`processing ${project.name}`);
    const {moduleRepo, classRepo, importRepo, exportRepo, nameRepo} = getRepositories(connection);
    const factory = Record({
        classes: Map<string, EntityCore.Class>(),
        imports: Map<string, EntityCore.Import>(),
        exports: Map<string, EntityCore.Export>(),
        names: Map<string, EntityCore.Name>(),
        module: undefined as unknown as EntityCore.Module
    });
    return moduleRepo.find({where: { project}, relations: ['defaultExport']}).then((modules: EntityCore.Module[]) =>
        Promise.all(modules.map((module): Promise<any> =>
            Promise.all([Promise.resolve(module),
                imports(importRepo, module),
                classes(classRepo, module),
                getExports(exportRepo, module),
                names(nameRepo, module),
            ]).then(([module, imports, classes, exports, names]: ResultType) => {
                const r = factory({module, imports, classes, exports, names});
                // console.log(r.toJS());
                return r;
            }).then(module => {
                return moduleRepo.save(module.module).then(m => {
                    return module;
                })
            }))).then(modules => {
            return Map<string, ModuleRecord>(modules.map((module: ModuleRecord) => {
                if (module === undefined) {
                    console.log('undefined module');
                    throw new Error('undefined module');
                }
                if (!module.module) {
                    throw new Error('');
                }
                return [module.module.name, module];
            }));
        })).then((modules: Map<string, ModuleRecord>) =>
        modules.flatMap(module =>
            module.classes.map(class_ => handleClass(class_, module, modules, classRepo).catch(error => { console.log(error.message); })
            )));
}

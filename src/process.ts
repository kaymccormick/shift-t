import {Promise} from 'bluebird';
import {Map, Record, RecordOf} from "immutable";
import {
    Connection,
    Repository
} from "typeorm";
import EntityCore from "classModel/lib/src/entityCore";
import {namedTypes} from "ast-types/gen/namedTypes";
import winston, {Logger} from 'winston';

type ImportMap = Map<string, EntityCore.Import>;

export type ResultType = [EntityCore.Module, ImportMap,
    Map<string, EntityCore.Class>, Map<string, EntityCore.Export>,
    Map<string, EntityCore.Name>,
    Map<string, EntityCore.Interface>,
];

export interface ModuleProps {
    classes: Map<string, EntityCore.Class>;
    imports: Map<string, EntityCore.Import>;
    exports: Map<string, EntityCore.Export>;
    names: Map<string, EntityCore.Name>;
    module: EntityCore.Module;
    interfaces: Map<string, EntityCore.Interface>;
}

export type ModuleRecord = RecordOf<ModuleProps>;

function classes(classRepo: Repository<EntityCore.Class>, module: EntityCore.Module): Promise<Map<string, EntityCore.Class>> {
    return classRepo.find({module}).then(classes => {
        const noNames = classes.filter(c => !c.name);
        if (noNames.length > 1) {
            throw new Error('too many unnamed classes');
        }

        if (noNames.length) {
            throw new Error('pop')
        }
        return Map<string, EntityCore.Class>(classes.map(class_ => [class_.name!, class_]))
    })//.then(classes => ({
    //     classes,
    //
    // }))
}

function interfaces(interfaceRepo: Repository<EntityCore.Interface>, module: EntityCore.Module): Promise<Map<string, EntityCore.Interface>> {
    return interfaceRepo.find({module}).then(ifaces => Map<string, EntityCore.Interface>(ifaces.map(iface => [iface.name || '', iface])));
}

function getExports(exportRepo: Repository<EntityCore.Export>, module: EntityCore.Module, logger: Logger): Promise<Map<string, EntityCore.Export>> {
    return exportRepo.find({module}).then((exports: EntityCore.Export[]) => {
        const defaultExport = exports.find(e => e.isDefaultExport);
        if (defaultExport) {
            logger.info(`found default export ${defaultExport} for ${module}`);
        }
        module.defaultExport = defaultExport;
        return Map<string, EntityCore.Export>(exports.filter(export_ => export_.exportedName).map(export_ => [export_.exportedName || '', export_]))
    });
}

function imports(importRepo: Repository<EntityCore.Import>, module: EntityCore.Module): Promise<Map<string, EntityCore.Import>> {
    return importRepo.find({where: {module}, relations: ["module"]}).then(imports => {
        const defaultImport = imports.find(i => i.isDefaultImport);

        return Map<string, EntityCore.Import>(imports.map((import_: EntityCore.Import) => [import_.localName, import_]));
    });
}

function updateClassImplements(logger: Logger, classRepo: Repository<EntityCore.Class>, class_: EntityCore.Class, module: ModuleRecord, modules: Map<string, ModuleRecord>) {
    logger.debug('ENTER updateClassImplements');
    return class_.implementsNode.map((o: namedTypes.TSExpressionWithTypeArguments): () => Promise<any> => (): Promise<any> => {
        let exportedName;

        if (o.expression.type === 'Identifier') {
            const name = module.names.get(o.expression.name);
            if (name) {
                if (name.nameKind === 'import') {
                    const import_ = module.imports.get(o.expression.name);
                    if (import_) {
                        const sourceModule = modules.get(import_.sourceModuleName);
                        if (sourceModule) {
                            let export_: EntityCore.Export | undefined = undefined;
                            if (import_.isDefaultImport) {
                                export_ = sourceModule.module.defaultExport;
                                if (!export_) {
                                    throw new Error(`updateClassImplements: no default export for ${sourceModule.module.id} ${sourceModule.module.name}`);
                                }
                            } else {
                                if (!exportedName) {
                                    exportedName = import_.exportedName || '';
                                }
                                export_ = sourceModule.exports.get(exportedName);
                            }
                            if (export_) {
                                const interface2_ = sourceModule.interfaces.get(exportedName || '');
                                if (interface2_) {
                                    if (!class_.implements) {
                                        class_.implements = [interface2_];
                                    } else {
                                        class_.implements.push(interface2_);
                                    }
                                    return classRepo.save(class_).catch((error: Error): void => {
                                        console.log(`unable to persist class`);
                                    }).then((z) => undefined);
                                }
                            } else {
                                throw new Error(`no export`);
                            }
                        }
                    }
                }
            }
        }
        return Promise.resolve(undefined);
    }).reduce((a: Promise<void>, v: () => Promise<void>): Promise<void> => a.then(() => v()), Promise.resolve(undefined));
}

function updateSuperClass(class_: EntityCore.Class, module: ModuleRecord, classRepo: Repository<EntityCore.Class>, modules: Map<string, ModuleRecord>) {
    return (() => {
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
        if (name_) {
            if (name_.nameKind === 'class') {
                const c = module.classes.get(objectName);
                class_.superClass = c;
                return classRepo.save(class_).catch((error: Error): void => {
                    console.log(`unable to persist class: ${error.message}`);
                });
            }
            // class might not even be an import!
            const import_ = module.imports.get(objectName)
            if (!import_) {
                if (objectName === 'Array' || objectName === 'Error') {
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
                        if (!export_) {
                            throw new Error(`updateSuperClass: no default export for ${sourceModule.module.id} ${sourceModule.module.name}`);
                        }
                    } else {
                        if (!exportedName) {
                            exportedName = import_.exportedName || '';
                        }
                        export_ = sourceModule.exports.get(exportedName);
                    }
                    if (export_) {
                        const class2_ = sourceModule.classes.get(export_.localName || '');
                        if (class2_) {
                            class_.superClass = class2_;
                            return classRepo.save(class_).catch((error: Error): void => {
                                console.log(`unable to persist class: ${error.message}`);
                            }).then((z) => undefined);
                        }
                    } else {
                        throw new Error(`no export`);
                    }
                }
            }

            if (!okay) {
                throw new Error(`unable to find superclass for ${class_.name}`);
            }

        }
        return Promise.resolve(undefined);
    })();
}

function handleClass(
    logger: Logger,
    class_: EntityCore.Class,
    module: ModuleRecord,
    modules: Map<string, ModuleRecord>,
    classRepo: Repository<EntityCore.Class>,
    interfaceRepo: Repository<EntityCore.Interface>,
): Promise<any> {
    logger.debug('ENTER handleClass');
    const tasks: (() => Promise<any>)[] = [];
    if (class_.implementsNode && class_.implementsNode.length) {
        tasks.push(() => {
            return updateClassImplements(logger, classRepo, class_, module, modules);
        });
    }
    if (class_.superClassNode) {
        tasks.push((): Promise<any> => {
            return updateSuperClass(class_, module, classRepo, modules);
        });
    }
    logger.info('about to task reduce');
    return tasks.reduce((a: Promise<any>, v: () => Promise<any>): Promise<any> => a.then(() => {
        const r = v().catch((error: Error) => {
            logger.error('erro in reduce!', {error});
        });
        return r;
    }), Promise.resolve(undefined)).then(() => {
        return classRepo.save(class_).catch((error: Error): void => {
            console.log(`unable to persist class: ${error.message}`);
        })
    }).then(() => {
        logger.debug('FINISHED handleClass');
    }).catch((error: Error) => {
        logger.error('errorzzz', {error});
    });
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

function names(nameRepo: Repository<EntityCore.Name>, module: EntityCore.Module): Promise<Map<string, EntityCore.Name>> {

    return nameRepo.find({where: {module}}).then((names: EntityCore.Name[]) => Map<string, EntityCore.Name>(names.map(name => [name.name || '', name])));

}

export function doProject(project: EntityCore.Project, connection: Connection, logger: Logger): Promise<void> {
    logger.debug('ENTER doProject');
    const {moduleRepo, classRepo, importRepo, exportRepo, nameRepo, interfaceRepo} = getRepositories(connection);
    const factory = Record({
        classes: Map<string, EntityCore.Class>(),
        imports: Map<string, EntityCore.Import>(),
        exports: Map<string, EntityCore.Export>(),
        interfaces: Map<string, EntityCore.Interface>(),
        names: Map<string, EntityCore.Name>(),
        module: undefined as unknown as EntityCore.Module
    });
    return moduleRepo.find({
        where: {project},
        relations: ['defaultExport', 'types']
    }).then((modules: EntityCore.Module[]): Promise<any> =>
        modules.map((module): () => Promise<any> => () => {
            const o: { [x: string]: any } = {module};
            return imports(importRepo, module).then(imports_ => {
                o.imports = imports_;
            }).then(() => {
                return classes(classRepo, module).then(classes_ => {
                    o.classes = classes_;
                }).then(() => {
                    return getExports(exportRepo, module, logger).then(exports_ => {
                        o.exports = exports_;
                    }).catch((error: Error) => {
                        logger.error('error!', {error});
                    }).then(() => {
                        return names(nameRepo, module).catch((error: Error) => {
                            logger.error('error!!', {error});
                        }).then(names_ => {
                            o.names = names_;
                        }).then(() => {
                            return interfaces(interfaceRepo, module).catch((error: Error) => {
                                logger.error('error!!!', {error});
                            }).then(ifaces => {
                                o.interfaces = ifaces;
                            }).then(() => {
                                const r = factory(o);
                                return r;
                            }).then((module: ModuleRecord): Promise<ModuleRecord> => {
                                return moduleRepo.save(module.module).catch((error: Error): void => {
                                    console.log(module.module);
                                    console.log(`unable to persist module: ${error.message}`);
                                }).then((module_) => {
                                    //                            module.module = module_;
                                    return module;
                                });
                            });
                        });
                    });
                });
            });
            // @ts-ignore
        }).reduce((a, v: () => Promise<any>) => a.then(r => {
            const z = v();
            return z.then(cr => [...r, cr]).catch((error: Error) => {
                logger.error('errorz', {error});
            });;
        }), Promise.resolve([]))).then((modules: ModuleRecord[]): Map<string, ModuleRecord> => {
        logger.info('zz', { modules });
        return Map<string, ModuleRecord>(modules.map((module: ModuleRecord): [string, ModuleRecord] => {
            logger.info('zz1');
            if (module === undefined) {
                console.log('undefined module');
                logger.error('woop');
                throw new Error('undefined module');
            }
            if (!module.module) {
                logger.error('woop2', { module });
                throw new Error('module');
            }
            return [module.module.name!, module];
        }));
    }).then((modules: Map<string, ModuleRecord>): Promise<any> => {
        logger.info('modules', {modules: modules.toJS()});
        console.log(`got ${modules.count()} modules`);
        // @ts-ignore
        return modules.map((module): () => Promise<any> => () => {
            //console.log(module.module.types);
            // @ts-ignore
            logger.info('zzzz');
            return module.classes.map((class_): () => Promise<any> => () => handleClass(logger, class_, module, modules, classRepo, interfaceRepo).catch((error: Error) => {
                logger.error('error', {error});
            })).reduce((a: Promise<any>, v: () => Promise<any>): Promise<any> => a.then(() => v()), Promise.resolve(undefined));
        }).reduce((a: Promise<any>, v: () => Promise<any>): Promise<any> => a.then(() => v()), Promise.resolve(undefined)) as Promise<void>;
    }).then(() => {
        logger.debug('FINISED doProject');
    }).catch((error: Error) => {
        logger.error('error', {error});
    });
}





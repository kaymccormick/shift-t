import {Promise} from 'bluebird';
import j from 'jscodeshift';
import {namedTypes} from "ast-types/gen/namedTypes";
import EntityCore from "classModel/lib/src/entityCore";
import {copyTree} from "../../utils";
import { TransformUtilsArgs, myReduce,TransformUtils } from '../../transformUtils';
import {NodePath} from "ast-types/lib/node-path";
import { PromiseResult } from '../../types';

export class ProcessInterfaces {
    public static processInterfaceDeclarations(
        args: TransformUtilsArgs,
        module: EntityCore.Module,
        file: namedTypes.File,
    ): Promise<PromiseResult<EntityCore.Interface[]>> {
    const result = { success: false, hasResult: false, id: 'processInterfaceDeclarations' };
        return myReduce<namedTypes.TSInterfaceDeclaration, EntityCore.Interface>(args.logger, j(file).find(namedTypes.TSInterfaceDeclaration).nodes(),
         { success: true, hasResult: true, result: [] as EntityCore.Interface[], id: result.id },
         (iDecl: namedTypes.TSInterfaceDeclaration): Promise<PromiseResult<EntityCore.Interface>> => {
            if(!iDecl.id) {
                throw new Error('no interface name');
            }
            if(iDecl.id.type !== 'Identifier') {
                throw new Error(`unsupported declaration type ${iDecl.id.type}`);
            }
            const idName = iDecl.id.name;

            if(iDecl.typeParameters) {
                iDecl.typeParameters.params.map((param: namedTypes.TSTypeParameter) => {
                });
            }

            const interfaceRepo = args.connection.getRepository(EntityCore.Interface);
            const nameRepo = args.connection.getRepository(EntityCore.Name);
            return nameRepo.find({module, name: idName}).then((names) => {
                if(names.length === 0) {
                    const name = new EntityCore.Name();
                    name.name = idName;
                    name.nameKind = 'interface';
                    name.module = module;
                    args.logger.debug('saving name');
                    return nameRepo.save(name).catch((error: Error): void => {
                        args.logger.debug(`unable to persist name: ${error.message}`);
                    }).then(() => undefined);
                } else {
                    const name = names[0];
                    name.nameKind = 'interface';
                    args.logger.debug('saving name');
                    return nameRepo.save(name).catch((error: Error): void => {
                        args.logger.debug(`unable to persist name: ${error.message}`);
                    });
                }
            }).then(() => interfaceRepo.find({where: {module, name: idName}, relations: ['module']})).then((interfaces): Promise<any> => {
                if(!interfaces.length) {
                    /* create new class instance */
                    const interface_ = new EntityCore.Interface()
                    interface_.module = module;
                    interface_.name = idName;
                    //                    class_.astNode = m;
                    interface_.astNode = copyTree(iDecl).toJS();
                    args.logger.debug('saving interface');
                    return interfaceRepo.save(interface_).catch((error: Error): void => {
                        args.logger.debug(`unable to persist interface: ${error.message}`);
                    });
                } else {
                    /* should check and update, no? */
                    return Promise.resolve(interfaces[0]);
                }
            }).then((interface_: EntityCore.Interface) => {
                if(!interface_) {
                    throw new Error('failure, no interface!');
                }
                return [() => this.processPropertyDeclarations(args, interface_, iDecl), ...j(iDecl).find(namedTypes.TSMethodSignature).nodes().map((node: namedTypes.TSMethodSignature) => () => {
                    return this.processInterfaceMethod(args, interface_, node)
                })].reduce((a: Promise<void>, v: () => Promise<void>): Promise<void> => a.then(() => v()), Promise.resolve(undefined));
            });
            });
    }

    public static processInterfaceMethod(args: TransformUtilsArgs, iface: EntityCore.Interface, childNode: namedTypes.TSMethodSignature): Promise<void> {
    args.logger.debug(`processInterfaceMethod`);
        const methodDef = childNode;
        const key = methodDef.key;
        let methodName = '';
        if (key.type === "Identifier") {
            methodName = key.name;
        } else {
            throw new Error(key.type);
        }

        const methodRepo = args.connection.getRepository(EntityCore.InterfaceMethod);
        return methodRepo.find({
            interface_: iface,
            "name": methodName}).then((methods: EntityCore.InterfaceMethod[]): Promise<any> => {
            if(methods.length === 0) {
                const m = new EntityCore.InterfaceMethod()
                m.name = methodName;
                m.interface_ = iface;
                /*                    if(methodDef.accessibility) {
                        m.accessibility = methodDef.accessibility ;
                    }*/
                args.logger.debug('saving method');
                return methodRepo.save(m).catch((error: Error): void => {
                    args.logger.debug(`unable to method class: ${error.message}`);
                });
            } else {
                return Promise.resolve(methods[0]);
            }
        }).then((method: EntityCore.InterfaceMethod): Promise<any> => {
            method.astNode = copyTree(methodDef);
            args.logger.debug('saving method');
            return methodRepo.save(method).catch((error: Error): void => {
                args.logger.debug(`unable to persist method: ${error.message}`);
            });
        }).then((method: EntityCore.InterfaceMethod) => {
        });
        return Promise.resolve(undefined);
    }

    public static processPropertyDeclarations(
        args: TransformUtilsArgs,
        iface: EntityCore.Interface,
        inNode: namedTypes.Node,
    ): Promise<any>
    {
        if(!iface.module) {
            throw new Error('need module');
        }
        return j(inNode).find(namedTypes.TSPropertySignature).nodes().map((n: namedTypes.TSPropertySignature): () => Promise<any> => () => {
            if(n.key.type !== 'Identifier') {
                throw new Error(`unsupported key type ${n.key.type}`);
            }
            const propName = n.key.name;
            args.logger.debug(`name is ${n.key.name}`);
            const propertyRepo = args.connection.getRepository(EntityCore.InterfaceProperty);

            return ((): Promise<any> => {
                if(n.typeAnnotation != null && iface.module !== undefined) {
                    args.logger.debug('here it is');
                    // @ts-ignore
                    return TransformUtils.handleType(args, iface.module.id, n.typeAnnotation.typeAnnotation);
                } else {
                // fixme code smell
                    throw new Error('beep');
                    return Promise.resolve(undefined);
                }
            })().then((type: EntityCore.TSType|undefined): Promise<any> => {
                if (type) {
                    if (n.typeAnnotation) {
                        const t1 = n.typeAnnotation.typeAnnotation;
                        args.logger.debug(`t1.type is ${t1.type}`);
                        //this.handleTypeAnnotation(args);
                    }
                }
                // @ts-ignore
                return propertyRepo.find({iface, property: { name: propName }}
                ).then((props: EntityCore.InterfaceProperty[]): Promise<any> => {
                    if(props.length === 0) {
                        const p = new EntityCore.InterfaceProperty();
                        p.iface = iface;
                        p.property = new EntityCore.Property();
                        if(!type) {
                            throw new Error('no type');
                        }

                        p.property.type = type;
                        p.property.name = propName;
                        p.property.computed = n.computed;
                        p.property.readonly = n.readonly;
                        p.property.optional = n.optional;
                        p.property.hasInitializer = n.initializer != null;
                        p.property.astNode = copyTree(n).toJS();

                        args.logger.debug('saving property');
                        return propertyRepo.save(p).catch((error: Error): Promise<any> => {
                            args.logger.debug('unable to save property');
                            return Promise.resolve(undefined);
                        });
                    } else {
                        args.logger.debug('returning existing property');
                        return Promise.resolve(props[0]);
                    }

                }).catch((error: Error): void => {
                    args.logger.debug(`error is ${error.message}`);
                });
            });
        }).reduce((a: Promise<void>, v: () => Promise<void>): Promise<void> => a.then(() => v()), Promise.resolve(undefined));
    }
}

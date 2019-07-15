import {Promise} from 'bluebird';
import j from 'jscodeshift';
import {namedTypes} from "ast-types/gen/namedTypes";
import EntityCore from "classModel/lib/src/entityCore";
import {copyTree} from "../../utils";
import { TransformUtilsArgs, myReduce,TransformUtils } from '../../transformUtils';
import {NodePath} from "ast-types/lib/node-path";
import { PromiseResult } from '../../types';
import AppError from '../../AppError';

export class ProcessInterfaces {
    public static processInterfaceDeclarations(
        args: TransformUtilsArgs,
        module: EntityCore.Module,
        file: namedTypes.File,
    ): Promise<PromiseResult<EntityCore.Interface[]>> {
        const baseId = `processInterfaceDeclarations-${module.name}`;
        const result = { success: false, hasResult: false, id: baseId };
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
                        args.logger.debug(`saving interface name ${idName}`);
                        return nameRepo.save(name).catch((error: Error): void => {
                            args.logger.debug(`unable to persist name: ${error.message}`);
                        }).then(() => undefined);
                    } else {
                        const name = names[0];
                        args.logger.debug(`resaving existing interface name ${idName} (kind was ${name.nameKind})`);
                        name.nameKind = 'interface';
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
            throw new AppError(`unidentified key type ${key.type}`);
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
    ): Promise<PromiseResult<EntityCore.InterfaceProperty[]>>
    {
    const baseId = `processPropertyDeclarations`;
        const inResult:PromiseResult<EntityCore.InterfaceProperty[]> = { id: baseId,
         hasResult: true, success: true, result: [] };
        args.logger.debug(`${baseId}(${iface.name}[${iface.id}])`, { type: 'functionInvocation' });
        if(!iface.module) {
            throw new Error('need module');
        }
        args.logger.debug('find(namedTypes.TSPropertySignature)');
        return myReduce(args.logger, j(inNode).find(namedTypes.TSPropertySignature).nodes(), inResult, (n: namedTypes.TSPropertySignature): Promise<PromiseResult<EntityCore.InterfaceProperty>> => {
            args.logger.debug(`found ${JSON.stringify(copyTree(n).toJS())}`);
            if(n.key.type !== 'Identifier') {
                throw new Error(`unsupported key type ${n.key.type}`);
            }
            const propName = n.key.name;

            const propertyRepo = args.connection.getRepository(EntityCore.InterfaceProperty);

            return ((): Promise<PromiseResult<EntityCore.TSType>> => {
                if(n.typeAnnotation != null && iface.module !== undefined) {
                    return TransformUtils.handleType(args, iface.module!.id!, n.typeAnnotation.typeAnnotation);
                } else {
                return Promise.resolve({ success: true, hasResult: false, id: 'type'});
                }
            })().then((typeResult: PromiseResult<EntityCore.TSType>): Promise<any> => {
                if (typeResult.hasResult) {
                    args.logger.debug(`received type: ${typeResult.toString()}`, { result: typeResult });
                    /*
                    if (n.typeAnnotation) {
                        const t1 = n.typeAnnotation.typeAnnotation;
                        args.logger.debug(`t1.type is ${t1.type}`);
                        //this.handleTypeAnnotation(args);
                    }*/
                }
                args.logger.debug(`looking for property ${propName} on interface ${iface.name}`);
                // @ts-ignore
                return propertyRepo.find({ relations: ['type'], where: {iface, property: { name: propName }}}
                ).then((props: EntityCore.InterfaceProperty[]): Promise<any> => {
                    if(props.length === 0) {
                        args.logger.debug('property not found, creating new property');
                        const p = new EntityCore.InterfaceProperty();
                        p.iface = iface;
                        p.type = typeResult.result;
                        p.name = propName;
                        p.computed = n.computed;
                        p.readonly = n.readonly;
                        p.optional = n.optional;
                        p.hasInitializer = n.initializer != null;
                        p.astNode = copyTree(n).toJS();

                        args.logger.debug('saving property', { property: p.toPojo({minimal: true}) });
                        return propertyRepo.save(p)/*.catch((error: Error): Promise<any> => {
                            args.logger.error(`unable to save property ${error.message}`, { error });
                            return Promise.resolve(undefined);
                        })*/.then(p_ => {
                        return Promise.resolve({ success: true, id: 'prop', result: p_, hasResult: true });
                        });
                    } else {
                        args.logger.debug('returning existing property');
                        const p = props[0];
                        p.type = typeResult.result;
                        p.readonly = n.readonly;
                        p.optional = n.optional;
                        p.hasInitializer = n.initializer != null;
                        p.astNode = copyTree(n).toJS();
                        return propertyRepo.save(p)/*.catch((error: Error): Promise<any> => {
                            args.logger.error(`unable to save property ${error.message}`, { error });
                            return Promise.resolve(undefined);
                        })*/.then(p_ => {
                        return Promise.resolve({ success: true, id: 'prop', result: p_, hasResult: true });
                        });
                    }

                }).catch((error: Error): void => {
                    args.logger.debug(`error is ${error.message}`, { error: { message: error.message, stack: error.stack }});
                });
            });
        });
    }
}

import AppError from '../../AppError';
import { visit } from "ast-types";
import {Promise} from 'bluebird';
import j from 'jscodeshift';
import {namedTypes} from "ast-types/gen/namedTypes";
import {PatternKind} from "ast-types/gen/kinds";
import EntityCore from "classModel/lib/src/entityCore";
import { ProcessTypes } from '../types/ProcessTypes';
import {copyTree} from "../../utils";
import { compareAst } from '../../compareAst';
import { TransformUtilsArgs, myReduce } from '../../transformUtils';

import {NodePath} from "ast-types/lib/node-path";
import { PromiseResult, PromiseResultImpl } from '@heptet/common';

export class ProcessClasses {
    public static async processClassDeclarationsAsync(
        args: TransformUtilsArgs,
        module: EntityCore.Module,
        file: namedTypes.File,
    ): Promise<PromiseResult<EntityCore.Class[]>> {
    // @ts-ignore
        const mainResult: PromiseResult<EntityCore.Class[]> = { id: 'processClassDeclarationsAsync', success: true, hasResult: true, result: [] };
        args.logger.info('processClassDeclarations', {type: 'functionInvocation', module: module.toPojo()});
        args.logger.debug('looking for nodes of type ClassDeclaration');
        // @ts-ignore
        const x = j(file).find(namedTypes.ClassDeclaration).nodes();
        args.logger.debug(`found ${x.length} nodes`);

        // @ts-ignore
        return myReduce<namedTypes.ClassDeclaration, EntityCore.Class>(args.logger, x, mainResult, async (classDecl: namedTypes.ClassDeclaration): () => PromiseResult<EntityCore.Class> => {
            const classResult =  { id: 'processClassDeclarations.class',
	      success: false, hasResult: false };
            if(!classDecl.id) {
                args.logger.error('no class name');
                throw new AppError('no class name', 'no-class-name');
            }
            const classIdName = classDecl.id.name;
            args.logger.info('processClassDeclarations1', { className: classIdName });

            const classRepo = args.connection.getRepository(EntityCore.Class);
            const nameRepo = args.connection.getRepository(EntityCore.Name);
            const m = copyTree(classDecl).remove('body');
            const superClass = m.get('superClass');

            //@ts-ignore
            const nameResult = { id: 'name', success: false, hasResult: false };
            const names = await nameRepo.find({module, name: classIdName});
            let name;
            if(names.length === 0) {
                name = new EntityCore.Name();
                name.name = classIdName;
                name.nameKind = 'class';
                name.module = module;
                args.logger.debug('saving name');
                name = await nameRepo.save(name);
            } else {
                name = names[0];
            }
            let class_;
            const classes = await classRepo.find({module, name: classIdName});
            if(!classes.length) {
                /* create new class instance */
                class_ = new EntityCore.Class(module, classIdName, [], []);
                class_.astNode = m;
                class_.superClassNode = m.get('superClass');
                class_.implementsNode = m.get('implements');
                args.logger.debug(`saving class ${class_.name}`,
                    { "class": class_.toPojo({minimal: true}) });
                const class__ = await classRepo.save(class_);
            } else {
                class_ = classes[0];
                class_.astNode = m;
                class_.superClassNode = m.get('superClass');
                class_.implementsNode = m.get('implements');
                args.logger.debug('saving class');
                const class__ = await classRepo.save(class_);
            }
            return PromiseResultImpl.successResult('', class_);
        });
    }

    public static processClassDeclarations(
        args: TransformUtilsArgs,
        module: EntityCore.Module,
        file: namedTypes.File,
    ): Promise<PromiseResult<EntityCore.Class[]>> {
    // @ts-ignore
        const mainResult: PromiseResult<EntityCore.Class[]> = {
            id: 'processClassDeclarations', success: true, hasResult: true, result: [] };
        args.logger.info('processClassDeclarations', {type: 'functionInvocation',
            module: module.toPojo()});
        args.logger.debug('looking for nodes of type ClassDeclaration');
        // @ts-ignore
        const x = j(file).find(namedTypes.ClassDeclaration).nodes();
        args.logger.debug(`found ${x.length} nodes`);

        // @ts-ignore
        return myReduce<namedTypes.ClassDeclaration, EntityCore.Class>(
            args.logger,
            x,
            mainResult,
            (classDecl: namedTypes.ClassDeclaration): Promise<PromiseResult<EntityCore.Class>> => {
                const classResult =  { id: 'processClassDeclarations.class',
	    success: false, hasResult: false };
                if(!classDecl.id) {
                    args.logger.error('no class name');
                    throw new AppError('no class name', 'no-class-name');
                }
                const classIdName = classDecl.id.name;
                args.logger.info('processClassDeclarations1', { className:
	    classIdName });

                const classRepo = args.connection.getRepository(EntityCore.Class);
                const nameRepo = args.connection.getRepository(EntityCore.Name);
                const m = copyTree(classDecl).remove('body');
                const superClass = m.get('superClass');

                //@ts-ignore
                return (() => {
                    const nameResult = { id: 'name', success: false,
                        hasResult: false };
                    return nameRepo.find({module, name: classIdName})
                        .then((names): Promise<PromiseResult<EntityCore.Name>>  => {
                            if(names.length === 0) {
                                const name = new EntityCore.Name();
                                name.name = classIdName;
                                name.nameKind = 'class';
                                name.module = module;
                                args.logger.debug('saving name');
                                return nameRepo.save(name)
                                    .then((name_):
                                    Promise<PromiseResult<EntityCore.Name>> => {
                                        return Promise.resolve(Object.assign({},
			    nameResult, { result: name_,
			    success: true,
			    hasResult: true }));
                                    });
                            } else {
                                return Promise.resolve(Object.assign({},
                                    nameResult, { result: names[0], success: true,
                                        hasResult: true }));
                            }
                        });
                })().then((): Promise<PromiseResult<EntityCore.Class>> => classRepo.find({module, name: classIdName}).then((classes): Promise<PromiseResult<EntityCore.Class>> => {
                //args.logger.debug('found classes', { classes: classes.map(c => c.toPojo()) } );
                    if(!classes.length) {
                    /* create new class instance */
                        const class_ = new EntityCore.Class(module, classIdName, [], []);
                        class_.astNode = m;
                        class_.superClassNode = m.get('superClass');
                        class_.implementsNode = m.get('implements');
                        args.logger.debug(`saving class ${class_.name}`, { "class": class_.toPojo({minimal: true}) });
                        return classRepo.save(class_).then(class__ => {
                            return Promise.resolve(Object.assign({}, classResult, { result: class__, success: true, hasResult: true }));
                        });
                    } else {
                        const class_ = classes[0];
                        class_.astNode = m;
                        class_.superClassNode = m.get('superClass');
                        class_.implementsNode = m.get('implements');
                        args.logger.debug('saving class');
                        return classRepo.save(class_).then(class__ => {
                            return Promise.resolve(Object.assign({}, classResult, { result: class__, success: true, hasResult: true }));
                        });
                    }
                }).then((classResult: PromiseResult<EntityCore.Class>) => {
                    const promises: ([string, () => Promise<PromiseResult<any>>])[] = [];
                    const me = this;
                    visit(classDecl, {
                        visitTSDeclareMethod(path: NodePath<namedTypes.TSDeclareMethod>): boolean {
                            promises.push(['a', () => me.processClassMethod(args,classResult.result!, path.node)]);
                            return false;
                        },
                        visitClassMethod(path: NodePath<namedTypes.ClassMethod>): boolean {
                            promises.push([`b ClassMethod ${classResult.result!.name}`, () => me.processClassMethod(args,classResult.result!, path.node)]);
                            return false;
                        },
                    });
                    return promises.reduce((a: Promise<PromiseResult<any>>, v: [string, () => Promise<PromiseResult<any>>]): Promise<PromiseResult<any>> => a.then(() => v[1]().catch((error: AppError): PromiseResult<any> => {
                        return { id: error.id, success: false, hasResult: false, error };
                    })), Promise.resolve({ ...mainResult, success: true }));
                }));
            });
    }

    public static processClassMethod(
        args: TransformUtilsArgs,
        moduleClass: EntityCore.Class,
        childNode: namedTypes.Node,
    ): Promise<PromiseResult<EntityCore.Method>> {

        const baseId = `processClassMethod`;

        args.logger.info(baseId, { "class":
	moduleClass.toPojo({minimal: true}) });

        const processClassMethodResult: PromiseResult<EntityCore.Method> = {
            id: baseId, success: false, hasResult: false};
	    
        const methodDef = childNode as
	  namedTypes.TSDeclareMethod|namedTypes.ClassMethod;

        const kind = methodDef.kind;
        if (kind !== "method") {
            return Promise.resolve(processClassMethodResult);
        }
        const key = methodDef.key;

        let methodName = '';
        if (key.type === "Identifier") {
            methodName = key.name;
        } else {
            args.logger.error('ast node type error', { expected: 'Identifier', got: key.type});
            throw new AppError('ast node type error', 'ast node type error');
        }

        const methodRepo = args.connection.getRepository(EntityCore.Method);
        return methodRepo.find({ relations: ['parameters'], where:{
            "classProperty": moduleClass,
            "name": methodName}})
	    .then((methods: EntityCore.Method[]): Promise<any> => {
                if(methods.length === 0) {
                    const m = new EntityCore.Method(methodName, [], moduleClass);
                    if(methodDef.accessibility) {
                        m.accessibility = methodDef.accessibility ;
                    }
                    args.logger.debug(`saving method ${m.name}`, { name: m.name });
                    return methodRepo.save(m);
                } else {
                    return Promise.resolve(methods[0]);
                }
            }).then((method: EntityCore.Method|undefined): Promise<PromiseResult<EntityCore.Method>> => {
                const methodResult: PromiseResult<EntityCore.Method> = {
	    id: 'method', success: false, hasResult: false };
                if(!method) {
                    return Promise.resolve(methodResult);
                }
		
                method.astNode = copyTree(methodDef).remove('body');
                args.logger.debug('updating ast Node in method');
                return methodRepo.save(method).then(method_ => {
                    return Object.assign({}, methodResult, { result: method_,
                        success: true, hasResult: true });
                });
            }).then((methodResult: PromiseResult<EntityCore.Method>):
            PromiseResult<any> => {
                if(!methodResult.hasResult) {
                    return methodResult;
                }
                const params = methodDef.params;

                // @ts-ignore
                return myReduce<PatternKind, EntityCore.Parameter>(
	    args.logger,
	    params,
	    {result: [], success: true, hasResult: true, id: 'hi'},
	    (pk: PatternKind, index: number):
	    Promise<PromiseResult<EntityCore.Parameter>> => {
	    // @ts-ignore
	    		const foundP = methodResult.result!.parameters!.find((p: EntityCore.Parameter) => pk.type === 'Identifier' && p.name === pk.name);
			if(foundP !== undefined) {
			  if(!compareAst(foundP.astNode, pk)) {
			  foundP.astNode == pk;
			  }
}
                        return ((): Promise<PromiseResult<EntityCore.TSType>> => { // IIFE
                            const typeResult: PromiseResult<EntityCore.TSType> =
		    { success: false, id: 'parameter type',
		        hasResult: false };
                            args.logger.debug('parameter');
                            let name = '';
                            let type_ = undefined;
                            if (pk.type === 'Identifier')  {
                                name = pk.name;
                                if (pk.typeAnnotation) {
                                    return ProcessTypes.handleType(
			    baseId,
			    args,
			    moduleClass.moduleId!,
			    pk.typeAnnotation.typeAnnotation,
			    );
                                }
                            } else if (pk.type === 'AssignmentPattern') {
                                name = pk.left.type === 'Identifier' ? pk.left.name : pk.left.type;
                            } else if (pk.type === 'RestElement') {
                            } else {
                                args.logger.error('type error', { type: pk.type });
                                throw new AppError('type error', 'type error');
                            }
                            return Promise.resolve(typeResult);
                        })().then((typeResult: PromiseResult<EntityCore.TSType>):
                        Promise<PromiseResult<EntityCore.Parameter>> => {
                            const paramResult: PromiseResult<EntityCore.Parameter> =
		    { success: true, hasResult: false, id: 'parameter' };
                            if(typeResult.success && typeResult.hasResult) {
                                const type = typeResult.result!;
                                if(!type && pk.type === 'Identifier'
			&& pk.typeAnnotation) {
                                    throw new AppError('no type', 'no type');
                                }
                                let name = '';
                                if (pk.type === 'Identifier')  {
                                    name = pk.name;
                                }
                                if(!name) {
                                    throw new AppError(`no name, ${pk.type}`, pk.type);
                                }
                                const parameter = new EntityCore.Parameter(
                                    name, methodResult.result!);
                                parameter.ordinal = index;
                                if(!type) {
                                    throw new AppError('no type', 'no type');
                                }
                                parameter.typeId = type.id;
                                args.logger.debug(`persisting parameter ${parameter}`);
                                return args.connection.manager.save(parameter)
                                    .then(parameter => {
                                        //@ts-ignore
                                        return Promise.resolve(Object.assign({},
			    paramResult, { success: true, hasResult: true,
			    result: parameter }));
                                    });
                            } else {
                                return Promise.resolve(paramResult);
                            }
                        });
                    });
            });
    }

}

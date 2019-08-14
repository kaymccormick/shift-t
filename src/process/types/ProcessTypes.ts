import uuidv4 from 'uuid/v4';
import { ok, strictEqual } from 'assert';
import {Promise} from 'bluebird';
import j from 'jscodeshift';
import {namedTypes} from "ast-types/gen/namedTypes";
import EntityCore from "classModel/lib/src/entityCore";
import {copyTree} from "../../utils";
import { TransformUtilsArgs, myReduce,TransformUtils } from '../../transformUtils';
import {NodePath} from "ast-types/lib/node-path";
import { PromiseResultImpl, PromiseResult } from '@heptet/common';
import AppError from '../../AppError';

export class ProcessTypes {
    public static processTypeAliasDeclarations(
        args: TransformUtilsArgs,
        module: EntityCore.Module,
        file: namedTypes.File,
    ): Promise<PromiseResult<EntityCore.TSTypeAlias[]>> {
        const baseId = `processTypeAliasDeclarations-${module.name}-${module.id}`;
        const result = { success: false, hasResult: false, id: baseId };
        const nameRepo = args.connection.getRepository(EntityCore.Name);
        const aliasRepo = args.connection.getRepository(EntityCore.TSTypeAlias);
        // @ts-ignore
        return myReduce<namedTypes.TSTypeAliasDeclaration, EntityCore.TSTypeAlias>(args.logger, j(file).find(namedTypes.TSTypeAliasDeclaration).nodes(),
            { success: true, hasResult: true, result: [], id: result.id },
            (decl: namedTypes.TSTypeAliasDeclaration): Promise<PromiseResult<EntityCore.TSTypeAlias>> => {
                strictEqual('Identifier', decl.id.type);
                const n = decl.id.name;
                return nameRepo.find({module, name: n}).then((names): Promise<PromiseResult<EntityCore.Name>> => {
                    if(names.length) {
                        const name = names[0];
                        ok(!name.nameKind || name.nameKind === 'type');
                        if(!name.nameKind) {
                            name.nameKind = 'type';
                            return nameRepo.save(name).then((name_): Promise<PromiseResult<EntityCore.Name>> => {
                                return PromiseResultImpl.successResultPromise('', name_);
                            });
                        } else {

                            return PromiseResultImpl.successResultPromise('', names[0]);
                        }
                    } else {
                        const name = new EntityCore.Name();
                        name.module = module;
                        name.name = n;
                        name.nameKind = 'type';
                        return nameRepo.save(name).then((name_): Promise<PromiseResult<EntityCore.Name>> => {
                            return PromiseResultImpl.successResultPromise('', name_);
                        });
                    }
                }).then((nameResult): Promise<PromiseResult<EntityCore.TSTypeAlias>> => {
                    if(nameResult.hasResult) {
                        return ProcessTypes.handleType(baseId, args, module.id!, decl.typeAnnotation).then((typeResult): Promise<PromiseResult<EntityCore.TSTypeAlias>> => {
                            if(typeResult.hasResult) {
                                return aliasRepo.find({moduleId: module.id, typeName:nameResult.result}).then((aliases): Promise<PromiseResult<EntityCore.TSTypeAlias>> => {
                                    if(aliases.length) {
                                        return PromiseResultImpl.successResultPromise('', aliases[0]);
                                    } else {
                                        return PromiseResultImpl.successNoResultPromise('');
                                    }
                                });
                            }
                            return PromiseResultImpl.successNoResultPromise('');
                        });
                    }
                    return PromiseResultImpl.successNoResultPromise('');

                });
            });
    }

    public static handleType(
        callerId: string,
        args: TransformUtilsArgs,
        moduleId: number,
        typeAnnotation: namedTypes.Node,
    ): Promise<PromiseResult<EntityCore.TSType>> {
        //@ts-ignore
        ok(namedTypes[typeAnnotation.type].check(typeAnnotation));
        const baseId = `${callerId}-handleType`;
        const result: PromiseResult<EntityCore.TSType> = {success: false, hasResult: false, id: baseId};
        const iterationId = uuidv4();
        const astNode: {} = copyTree(typeAnnotation).toJS();

        //@ts-ignore
        return args.restClient.findTsType(moduleId, astNode).then((type_: EntityCore.TSType): Promise<PromiseResult<EntityCore.TSType>> => {
            if (type_) {
                return Promise.resolve({success: true, hasResult: true, result: type_, id: result.id});
            } else {
                return args.restClient.createTsType(moduleId, astNode, 'propDecl').then((type_: EntityCore.TSType): Promise<PromiseResult<EntityCore.TSType>> => {
                    args.logger.debug(`created type via REST ${type_}`);
                    return Promise.resolve({success: true, hasResult: true, result: type_, id: result.id});
                }).catch((error: Error): Promise<PromiseResult<EntityCore.TSType>> => {
                    if (error.stack) {
                        args.logger.debug(error.stack.toString());
                    }
                    args.logger.debug(`unable to create ts type via rest: ${error.message}: ${JSON.stringify(astNode)}`);
                    return Promise.resolve({success: false, hasResult: false, id: result.id});
                });
            }
        });
    }
}

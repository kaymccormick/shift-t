import axios from 'axios';
import {EntityCore} from 'classModel';
import { Factory } from 'classModel/lib/src/entity/core/Factory';
import { FactoryInterface } from 'classModel/lib/src/types';
import { Logger} from 'winston';

export class RestClient {

    constructor(private baseUri: string, private factory: FactoryInterface) {
   }
   findTsType(moduleId: number, astNode?: any) {
     return axios.post(`${this.baseUri}/tstype/find/${moduleId}`, {astNode}).then(response => response.data.tstype).then(tsTypeInfo => {
     if(!tsTypeInfo) {
     return undefined;
     }
     const tsType = this.factory.createTSType();
     Object.keys(tsTypeInfo).forEach(key => {
     //@ts-ignore
     tsType[key] = tsTypeInfo[key];
     });
     return tsType;
});
   }
   createTsType(moduleId: number, astNode?: any|undefined, origin?: string) {
     return axios.post(`${this.baseUri}/tstype`, {tstype:{moduleId, astNode,origin}}).then(response => response.data).then(data => {
     if(!data.success) {
     const x = new Error(data.error);
     x.stack = data.stack;
     throw x;
     }
     return data.tstype;
     }).then(tsTypeInfo => {
          const tsType = this.factory.createTSType();
     Object.keys(tsTypeInfo).forEach(key => {
     //@ts-ignore
     tsType[key] = tsTypeInfo[key];
     });
     return tsType;
});
     }
}

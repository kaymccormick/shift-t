import axios from 'axios';
import {EntityCore} from 'classModel'; 

export class RestClient {
    constructor(private baseUri: string) {
   }
   findTsType(moduleId: number, astNode?: any) {
     return axios.post(`${this.baseUri}/tstype/find/${moduleId}`, {astNode}).then(response => response.data.tstype).then(tsTypeInfo => {
     if(!tsTypeInfo) {
     return undefined;
     }
     const tsType = new EntityCore.TSType();
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
throw new Error(data.error);
     }
     return data.tstype;
     }).then(tsTypeInfo => {
          const tsType = new EntityCore.TSType();
     Object.keys(tsTypeInfo).forEach(key => {
     //@ts-ignore
     tsType[key] = tsTypeInfo[key];
     });
});
     }
}

import axios from 'axios';

export class RestClient {
    constructor(private baseUri: string) {
   }
   findTsType(moduleId: number, astNode?: any) {
     return axios.post(`${this.baseUri}/tstype/find/${moduleId}`, {astNode});
   }
}

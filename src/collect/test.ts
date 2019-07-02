import {EntityCore} from "classModel";
import { Connection } from 'typeorm';
import { namedTypes } from 'ast-types/gen/namedTypes';

export default (connection: Connection) => {
return (connection:Connection, project:EntityCore.Project,fname:string,ast:namedTypes.File): Promise<void> => {
       console.log(fname);
       return Promise.resolve(undefined);
       };
};

import {NodePath} from "ast-types";

class Exported {
   name: string;
   nodePath?: {};


   constructor(name: string, nodePath?: {}) {
        this.name = name;
        this.nodePath = nodePath;
    }

    toPojo(): {} {
       return { name: this.name };
    }
}
export { Exported };

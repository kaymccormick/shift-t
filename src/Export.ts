import {NodePath} from "ast-types";
import {ExportPojo} from "./types";

class Export {
    public name: string;

    public constructor(name: string) {
        this.name = name;
    }

    public toPojo(): ExportPojo {
        return { name: this.name };
    }

    public static fromPojo(v: ExportPojo) {
return new Export(v.name);
    }
}
export { Export };

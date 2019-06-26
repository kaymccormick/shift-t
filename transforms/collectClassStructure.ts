import * as path from 'path';
import {API, FileInfo, Options} from "jscodeshift/src/core";
import {createRegistry} from "../src/TypeOrm/Factory";
import core from "jscodeshift";
import {Registry} from "classModel/lib/src";
import {processSourceModule} from "../src/Collector";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function recordRun(fileInfo: core.FileInfo, api: core.API, options: core.Options): void {
//    console.log(fileInfo.path);
}

function getRegistry(): Registry {
    let registry: Registry | undefined = undefined;
    try {
        registry = createRegistry();
    } catch(error) {
        throw error;
    }
    if(registry === undefined) {
        throw new Error('registry undefined');
    }
    return registry;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
module.exports = function (fileInfo: FileInfo, api: API, options: Options): string {
    recordRun(fileInfo, api, options);
    const j = api.jscodeshift;
    /* parse source */
    const collection = j(fileInfo.source);
    /* fiddle with path to get module name */
    //processSourceModule();
};


import {InMemoryRegistry} from "../InMemoryRegistry";
import {Registry} from "classModel/lib/src";

export function createRegistry(): Registry|undefined {
    return new InMemoryRegistry();
}

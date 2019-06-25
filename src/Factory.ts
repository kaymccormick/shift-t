import {InMemoryRegistry} from "./InMemoryRegistry";

export function createRegistry(): Registry|undefined {
    return new InMemoryRegistry();
}

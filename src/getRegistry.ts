import {Registry, GetRegistryInvocationArgs} from './types';
import {SimpleRegistry} from "./SimpleRegistry";

export function getRegistry(args: GetRegistryInvocationArgs): Registry {
    return new SimpleRegistry({}) as Registry;
}

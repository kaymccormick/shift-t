import { SimpleRegistry } from './Registry';
import {Registry, GetRegistryInvocationArgs} from './types';

export function getRegistry(args: GetRegistryInvocationArgs): Registry {
    return new SimpleRegistry({}) as Registry;
}

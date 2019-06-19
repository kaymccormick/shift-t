import { Registry, SimpleRegistry } from './Registry;';
import { getGetRegistryInvocationArgs } from './types';

export function getRegistry(args: GetRegistryInvocationaRgs): Registry {
return new SimpleRegistry({}) as Registry;
}

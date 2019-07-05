import A from './A';
import { C } from './C';

type X = C;

interface ab1<T extends C> {
foo: number|T;
bar: C;
}

export interface myIface {
  poop(a: number): void;
foo: number;
}
  

export default class B extends A implements myIface {
poop(a: number):void{return 0;}
}


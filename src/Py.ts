export class PyStr  {
  public s: string;
  public constructor(str: string) {
  this.s = str;
  }
  public join(...elts: any[]): PyStr {
    return new PyStr(elts.join(this.s))
    }
  public toString(): string {
  return this.s;
  }
  
  public valueOf(): string {
  return this.s;
  }

public split(): PyStr[] {
  return this.s.split(' ').map((s: string) => new PyStr(s));
  }
  
}

export class PyArray<T> extends Array<T> {
    public append(item: T): void {
        this.push(item);
    }
    public extend(items: T[]): void {
        this.push(...items);
    }
}

export class PyTuple<T> extends PyArray<T> {
  public tuple: boolean = true;
}

export class PyDict {
 [propName: string]: any;
 
 public constructor(initializer: any) {
   Object.keys(initializer).forEach((key) => { this[key] = initializer[key] });
   }
  public items() {
   return Object.keys(this).map((key) => ([key, this[key]]));
  }
}

export function print(...args: any[]){
console.log(...args)
}

export function list(arg: any) {
return arg;
}

export class Exception extends Error {
}

export function int(arg: any) {
return parseInt(arg, 10);
}

export const PySys = { stderr: { 'write': (b: any) => process.stderr.write(b) } }

import { visit, getFieldValue, getFieldNames,eachField, getBuilderName, builders as b, namedTypes as n } from 'ast-types';
import { Map, List, Set} from 'immutable';
import { ok } from 'assert';

export type CopyTreeResult = Map<string, ValueKind>;
export function copyTree(node: namedTypes.Node, report: (arg: string) => void, level: number = 0): CopyTreeResult {
    if(!report) {
    report = (arg): void => {};
    }
    report(`1.0> [${depth}] COPYTREE[ ${level} ${node.type} ]`);
    if(!n[node.type].check(node)) {
      throw new Error(`node of type ${node.type} doesn't check out`);
      }
    let out: Map<string, ValueKind> = Map<string, ValueKind>();
    if(node.comments) {
        out = out.set('comments', List<ValueKind>(node.comments.map(c =>
            copyTree(c, report, level + 1))));
    }
    if(node.loc) {
//    out = out.set('loc', node.loc);
    }
    report(`x> ${node.type}: ${getFieldNames(node).toString()}`);
    eachField(node, (name, value): void => {
        report(` a> ${node.type}: field ${name}`);
        report(` b> ${node.type}: value ${value}`);
        if (Array.isArray(value)) {
            report('value is array');
            if(typeof value[0]  === 'string') {//instanceof namedTypes.Node) {
            report('beep');
                throw new Error('unexected string input');
            }
            report(`${node.type}: field ${name} length ${value.length}`);
            if(value.length >0) {
                if(value[0].constructor && value[0].constructor.name === "Node") {
                report('detected constructor Node');
                    const x = List<Map<string,ValueKind>>(value.map((elem: namedTypes.Node): Map<string,ValueKind> => copyTree(elem, report, level + 1)));
                    out = out.set(name, x);
                } else{
                    const x = List<Map<string,ValueKind>>(value.map((elem: namedTypes.Node): Map<string,ValueKind> => copyTree(elem, report, level + 1)));
                    out = out.set(name, x);
                }
            } else{
                out = out.set(name, value);
            }
        } else if(value
        && value.constructor && value.constructor.name === "Node") {
            out = out.set(name, copyTree(value, report, level + 1));
        } else if(value && value.type) {
            out = out.set(name, copyTree(value, report, level + 1));
        } else {{
            out = out.set(name, value);
        }
        }
    });
    if(report) {
        report(`copyTree returning ${JSON.stringify(out, null, 4)}`);
    }
    return out;
}
export function copyTree2(node: namedTypes.Node, report: (arg: string) => void, level: number = 0): CopyTreeResult|undefined {
   let cache: List<Map<string, any>> = List<Map<string, any>>();
   let depth = 0;
  visit(node, {
   visitNode(path: NodePath<namedTypes.Node>): any {
   const tag = `[${depth.toString().padStart(2, ' ')} ${path.node.type.padEnd(16, ' ')}]`;
   report(`1.0> ${tag} visitNode`);
          let myDepth = depth;
          ok(myDepth === depth);
          report(`2.2> ${tag} calling traverse with depth = ${depth}`);
          depth++;
          this.traverse(path);
          depth--;
          ok(myDepth === depth);
          report(`2.7> ${tag} back from traverse with depth = ${depth}`);

          if(cache.get(depth + 1) ===undefined ) {
          report(`3.0> ${tag} initializing map for field values (${depth + 1})`);
          ok(myDepth === depth);
          
          cache= cache.set(depth + 1, Map<string, any>());
          } else {
          report(`4.0> ${tag} cache.get(depth + 1 = ${depth + 1}) = ${JSON.stringify(cache.get(depth + 1).toJS())}`);
          }
          ok(myDepth === depth);
          
          if(cache.get(depth) === undefined ) {
          cache= cache.set(depth, Map<string, any>());
          }
          const anode = path.node;
          ok(myDepth === depth);
          if(!n[anode.type].check(anode)) {
          throw new Error('invalid node');
          }
          ok(myDepth === depth);
          let nary: Set<string> = Set<string>(getFieldNames(anode));
          report(`6.0> ${tag} ${anode.type} fieldNames ${nary.toJSON()}`);
          ok(myDepth === depth);
          report(`6.5> ${tag} depth is ${myDepth} cache[${depth + 1}] ${cache.get(depth + 1).keySeq().toJSON()}`);
          nary = nary.subtract(cache.get(depth + 1).keySeq());
          report(`7.0> ${tag} ${anode.type} subtracted fieldNames ${nary.toJSON()}`);
          ok(myDepth === depth);
          report(`7.5> ${tag} Computing result.`);
          const result: Map<string, any> = Map<String, any>(nary.map(fName => [fName, getFieldValue(anode, fName)])).merge(cache.get(depth + 1));
          report(`7.7> ${tag} Computed result = ${JSON.stringify(result.toJS())}`);
          cache = cache.delete(depth + 1);
          let myName: string|undefined;
          if(typeof path.name === 'string') {
           myName = path.name;
          }
          ok(myDepth === depth);
          if(myName !== undefined) {
            report(`8.0> ${tag} updating cache for ${myName}`);
            report(`8,5 cache[${depth}][${myName}] = ${JSON.stringify(result)}`);
            cache = cache.set(depth, cache.get(depth).set(myName, result));
          } else {
          if(!path.parentPath.name) {
          throw new Error('expecting name');
          }
          const key = path.parentPath.name;
          report(`${tag} key=${key} ppn=${path.parent.name} pn=${path.name}`);
          report(`86 ${tag} ${depth} ${path.parentPath.name} ${path.name}`);
            let ary = cache.get(depth).get(path.parentPath.name) || List<Map<string, any>>();
            report(`$87 ${tag} cache[${depth}][${path.parentPath.name}] = ${JSON.stringify(ary)}`);
            report(`88 ${tag} ary[${path.name}] = ${JSON.stringify(result)}`);
            ary = ary.set(path.name, result);
/*            if(path.parentPath.name === 'body') {
              throw new Error(JSON.stringify(path.parentPath.name));
              }*/
            report(`$88 ${tag} cache[${depth}][${path.parentPath.name}] = ${JSON.stringify(ary)}`);
            cache = cache.set(depth, cache.get(depth).set(path.parentPath.name, ary));
          }
          
          ok(myDepth === depth);
          report(`11> ${tag} ${depth} ${anode.type} ${JSON.stringify(result.toJS())}`);
          },
          });

          return cache.get(0).get('root');
          }

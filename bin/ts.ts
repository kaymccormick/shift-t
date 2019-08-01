import * as ts from 'typescript';

let program = ts.createProgram(['out.ts'], {target: ts.ScriptTarget.ES5,
module: ts.ModuleKind.CommonJS
})
let checker = program.getTypeChecker();

for (const sourceFile of program.getSourceFiles()) {
if(!sourceFile.isDeclarationFile) {
ts.forEachChild(sourceFile, visit);
}
}

function visit(node: ts.Node) {
//console.log(ts.isVariableDeclaration)
    if(ts.isVariableDeclaration(node)) {
      let symbol = checker.getSymbolAtLocation(node.name);
      if(symbol) {
          const node1 = symbol.valueDeclaration!;
          const tt = checker.getTypeOfSymbolAtLocation(symbol, node1);
          const t= checker.typeToString(
        tt)
      console.log(t);
      }
} else {
   ts.forEachChild(node, visit);
   }
}

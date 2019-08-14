import { ArgumentParser } from 'argparse'
import {getBuilderName, builders as b, namedTypes as n} from 'ast-types';
import * as k from 'ast-types/gen/kinds';
import {print} from 'recast';
import fs from 'fs';
import * as ts from 'typescript';
import { ok } from 'assert';

const importPy = { "type" : "ImportDeclaration", "specifiers" : [
      { "type" : "ImportNamespaceSpecifier",
      "local" : { "type" : "Identifier", "name" : "Py" } } ],
      "source" : { "type" : "Literal", "value" : "../src/Py",
      "raw" : "'../src/Py'" } };

const argParser = new ArgumentParser({});
argParser.addArgument(['-i', '--input-filename'], { required: false, help: 'json file to convert to typescript', defaultValue: 0 })
argParser.addArgument(['-o', '--output-filename'], { required: false, help: 'output file (default is stdout)', defaultValue: 1 })
const args = argParser.parseArgs();

const printer = ts.createPrinter({newLine: ts.NewLineKind.LineFeed})

const d = JSON.parse(fs.readFileSync(args.input_filename, {encoding: 'utf-8'}));

const preamble = [b.importDeclaration([
    b.importSpecifier(b.identifier('extend'),
        b.identifier('extend'))], b.literal('./src/translateLib'))]
preamble[0].comments = [b.commentBlock(' Preamble ')]

d.program.body = [importPy, ...d.program.body];

const typ:string|undefined = d.type;
if(typ === undefined) {
  process.stderr.write(JSON.stringify(d))
  throw new Error('undefined type');
}
const file = b[getBuilderName(typ)].from(d)

fs.writeFileSync(args.output_filename, print(file).code + "\n", 'utf-8')

let program = ts.createProgram([args.output_filename], {
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJS
})
let checker = program.getTypeChecker();
for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.fileName === args.output_filename) {
        ts.forEachChild(sourceFile, visit());
        const resultFile = ts.createSourceFile("out2.ts", "", ts.ScriptTarget.Latest, false, ts.ScriptKind.TS)
        const result = printer.printNode(ts.EmitHint.Unspecified, sourceFile, resultFile)
        fs.writeFileSync('out2.ts', result, 'utf-8')
	process.stdout.write(result)
    }
}

function visit(collect?: any) {
    return (node: ts.Node) => {
        const printer = ts.createPrinter({newLine: ts.NewLineKind.LineFeed})
	if(ts.isPropertyDeclaration(node)) {
            let symbol = checker.getSymbolAtLocation(node.name);
            if (symbol) {
                const tt = checker.getTypeOfSymbolAtLocation(symbol, node);
                node.type = checker.typeToTypeNode(tt)
                const t = checker.typeToString(
                    tt)
	    }
	
	} else if(ts.isMethodDeclaration(node)) {
            let symbol = checker.getSymbolAtLocation(node.name);
            if (symbol) {
                const node1 = symbol.valueDeclaration!;
		const sig = checker.getSignatureFromDeclaration(node)
		if(sig) {
                const typ = checker.getReturnTypeOfSignature(sig);
                node.type = checker.typeToTypeNode(typ)
                const t = checker.typeToString(
                    typ)
}
	    }
        } else if (ts.isVariableDeclaration(node)) {
            let symbol = checker.getSymbolAtLocation(node.name);
            if (symbol) {
                const node1 = symbol.valueDeclaration!;
                const tt = checker.getTypeOfSymbolAtLocation(symbol, node1);
                const new_node = ts.createVariableDeclaration(node.name, checker.typeToTypeNode(tt), node.initializer)
                node.type = checker.typeToTypeNode(tt)
                const t = checker.typeToString(
                    tt)

                /*                if('declarations' in node.parent) {
                        const index = node.parent.declarations.indexOf(node)
                        ok(index !== -1)
                        const decl = [...node.parent.declarations]
                        decl[index] = new_node
                        node.parent.declarations = decl
                    }
    		*/
                //return new_node;
            }
            ts.forEachChild(node, visit());
        } else {
            ts.forEachChild(node, visit());
        }
    };
}



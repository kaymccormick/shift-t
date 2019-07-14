import fs from 'fs'
import path from 'path';
import { copyTree, copyTree2 } from "./copyTree";
import { builders as b, getFieldNames, getFieldValues, namedTypes as n } from "ast-types";
import { print, parse } from "recast";

const report = (arg: string): void => console.log(arg);

test("1", (): void => {
    const file = b.file(
        b.program([
            b.ifStatement(
                b.identifier("test"),
                b.returnStatement(null),
                b.breakStatement()
            )
        ])
    );

    const code = print(file).code;
    const copied = copyTree(file, report);
    const code2 = print(copied.toJS()).code;
    expect(code).toStrictEqual(code2);
});

test('2', () => {
    const origCode = 'class A {\n    public b?: number;\n}';
    const ast = parse(origCode, { parser: require("recast/parsers/typescript")});
    expect(print(ast).code).toStrictEqual(origCode);
    const copy = copyTree(ast, report).toJS();
    expect(print(copy).code).toStrictEqual(origCode);
});


test.only('2_2', () => {
    const origCode = 'class A {\n    public b?: number;\n}';
    const ast = parse(origCode, { parser: require("@typescript-eslint/typescript-estree")});
    if(ast) {
        console.log('1');
        if(ast.program) {
            console.log('1');
            if(ast.program.body) {
                console.log('1');
                console.log(ast.program.body);
                if(ast.program.body.length) {
                    console.log('1');
                    if(ast.program.body[0]) {
                        console.log('1');
                        if(ast.program.body[0].body) {
                            console.log('1');
                            if(ast.program.body[0].body.body[0].key) {
                                console.log('1');
                                //console.log(ast.program.body[0].body.body[0].key);
                                ast.program.body[0].body.body[0].key.optional = true;
                            }
                        }
                    }

                }
            }
        }

    }
    expect(print(ast).code).toStrictEqual(origCode);
    const copy = copyTree2(ast, report).toJS();
    expect(print(copy).code).toStrictEqual(origCode);
});

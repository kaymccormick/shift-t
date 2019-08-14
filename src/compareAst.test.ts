import {compareAst } from './compareAst';
import { builders as b } from 'ast-types';
import{ parse  } from 'recast';

test('1', () => {
    const node = parse(`a = b;
c = d;
`);
    const node3 = parse(`if(a) {
    a = b;
c = e;
}
`);
const node2 =             b.ifStatement(
                b.identifier("test2"),
                b.returnStatement(null),
                b.breakStatement());
		expect(compareAst(node, node3)).toBe(true);
});

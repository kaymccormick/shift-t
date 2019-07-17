import { builders as b, namedTypes as n } from 'ast-types';
import { copyTree } from './utils';

function makeFile() {
    return b.file(b.program([]));
}

test('1', (): void => {
    const file =  makeFile();
    expect(n.File.check(file)).toBeTruthy();
    const tree = copyTree(file);
    expect(tree.toJS()).toMatchSnapshot();
});

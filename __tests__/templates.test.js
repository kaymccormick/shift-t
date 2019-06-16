const fs = require('fs');
const j = require('jscodeshift');
const path = require('path');
const recast = require('recast');
const astTypes = require('ast-types');

test('1', () => {
    const src = fs.readFileSync(path.join(__dirname, '../files/regexp1.js'), { encoding: 'utf-8' });
    const c = j(src);
//    const ast = recast.parse();
    //    expect(ast).toBeDefined();
});

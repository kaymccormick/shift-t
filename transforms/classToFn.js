const assert = require('assert');
const fs = require('fs');
const recast = require('recast');
const camelcase = require('camelcase');
const { namedTypes, builders, getFieldNames } = require('ast-types');

const b = builders;

module.exports = (fileInfo, api, options) => {
  const { report } = api;
  const map = JSON.parse(fs.readFileSync('map.json', { encoding: 'utf-8' }));
  const j = api.jscodeshift;
  const r = j(fileInfo.source);

  const newBody = [];// b.expressionStatement(b.assignmentExpression("=", b.identifier("foo"), b.identifier("bar")))];
  const newFile = b.file(b.program(newBody));

  r.find(j.ImportDeclaration);
  r.find(j.ClassDeclaration).forEach((classPath) => {
    const decl = classPath.value;
    let superClassName;
    if (decl.superClass) {
      assert.equal(decl.superClass.type, 'Identifier');
      superClassName = decl.superClass.name;
      const x2 = j(fileInfo.source).find(j.ClassDeclaration, x => x.id.name === superClassName);
      const [superDeclPath] = x2.paths();
      if (superDeclPath) {
        const superNode = superDeclPath.value;
      } else {
          throw new Error(`need superclass for ${decl.id.name}`);
      }
    }
    j(classPath).find(j.MethodDefinition).forEach((methodPath) => {
      const methodNode = methodPath.value;
      const spec = `${decl.id.name}.${methodNode.key.name}`;
      const fname = camelcase(spec);
      let newName = map[spec];
      if (!newName) {
        map[spec] = fname;
        newName = fname;
      }
      const func = j.functionDeclaration(j.identifier(newName), methodNode.value.params, methodNode.value.body);
      j(methodNode.value.body).find(j.Super).forEach((superPath) => {
        const superNode = superPath.value;
          const parentNode = superPath.parent.value;
          if(parentNode.type === 'CallExpression') {
          } else if(parentNode.type === 'MemberExpression') {

          }


        assert.equal(parentNode.type, 'MemberExpression');
        const { property } = parentNode;
        assert.equal(property.type, 'Identifier');
        const id = property.name;

        const spec2 = `${superClassName}.${id}`;
        const fname2 = camelcase(spec2);
        let newName2 = map[spec2];
        if (!newName2) {
          map[spec2] = fname2;
          newName2 = fname2;
        }
          //const parentPath =
                superPath.parent.parent.value.callee = b.identifier(newName2);
//          report(parentPath.value.type);
//        report(newName2);
      });
      newBody.push(func);
    });
  });
    report(recast.print(newFile).code);
  return api.jscodeshift(recast.print(newFile).code);/* .findVariableDeclarators('foo').module  .renameTo('bar')`    .toSource(); */
};
// fs.writeFileSync('out.json', JSON.stringify(map), 'utf-8');

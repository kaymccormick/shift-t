const recast = require('recast');
const fs = require('fs');
const path = require('path');
const root = '/local/home/jade/docutils-dev/docutils-monorepo/docutils-js';

module.exports = function(fileInfo, api, options) {
    const j = api.jscodeshift;
    const source = fileInfo.source;
    const p = fileInfo.path;
    const d = path.dirname(p);

    const r = j(fileInfo.source);
    console.log(d);
    const x = r.find(j.ImportDeclaration, n => {
//        console.log(`d: ${d}, ${n.source.value}, ${root}`);
        const path2 = path.relative(root, path.join(d, n.source.value));
  //      console.log(path2);
       return  path2 === 'src/nodes' || path2 === 'src/index' &&
    });
    x.paths().forEach(p => {
        console.log(p.value.specifiers.map(s => s.local.name));
    });

/*
    const paths = r.find(j.ClassDeclaration, p => p.superClass).paths();
    while(classes.length) {
        const nextClasses = [];
        classes.forEach((superClass) => {
            const subClasses = paths.filter(p => p.value.superClass.name === superClass).map(p =>
                p.value.id.name);
            if (subClasses.length) {
                superClasses.push(superClass);
            } else {
                leafClasses.push(superClass);
            }
            nextClasses.splice(nextClasses.length, 0, ...subClasses);
        });
        classes = nextClasses;
    }
    const transBody =  j.classBody([]);
    const file2 = recast.parse('import BaseWriter from \'../Writer\';\n' +
        'import { GenericNodeVisitor } from \'../nodes\';\n');
    const classDecl = j.classDeclaration(j.identifier('Translator'), transBody, j.identifier('GenericNodeVisitor'));
    file2.program.body.push(classDecl);
    const f = file2;
    //j.program([j.importDeclaration([j.importNamespaceSpecifier(j.identifier('BaseWriter'))],
    //    j.literal('../Writer'), ]));
    //console.log(Object.keys(api).filter(x => 1 || x.toLowerCase().indexOf('recast')!== -1));
    const methods = [];
    leafClasses.forEach(class_ => {
        const params = [j.identifier('node')];

        const m = j.methodDefinition("method", j.identifier(`visit_${class_}`),
            j.functionExpression(null, [j.identifier('node')], j.blockStatement([])));
        const eslintHint = j.commentBlock(" eslint-disable-next-line camelcase,no-unused-vars,class-methods-use-this ");

        m.comments = [eslintHint];
        const depart = j.methodDefinition("method", j.identifier(`depart_${class_}`),
            j.functionExpression(null, [j.identifier('node')], j.blockStatement([])));
        depart.comments = [eslintHint];
        //console.log(m);
        transBody.body.push(m, depart);
        //methods.push(m.toString());
    });
    fs.createWriteStream('code.js').write(recast.print(f).code);


    //console.log(recast.print(f).code);

//    console.log(methods);
   //         && classes.findIndex(x => p.superClass.name === x) !== -1).paths();
    //    classes = paths.map((n) => n.value.id.name);

    //const cl = x.find(j.ClassDeclaration, p => p.superClass && p.superClass.name === 'Element').paths().map((n) => n.value.id.name);
*/
return api.jscodeshift(fileInfo.source);/*
    .findVariableDeclarators('foo').module
  .renameTo('bar')
    .toSource();*/
}

const recast = require('recast');
const fs = require('fs');

module.exports = function(fileInfo, api, options) {
    const j = api.jscodeshift;
    console.log(fileInfo);
/*    
    const r = j(fileInfo.source);
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

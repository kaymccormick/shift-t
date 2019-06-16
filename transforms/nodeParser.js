const recast = require('recast');
const fs = require('fs');
/**
 *
 * Something related to procesing the class structure of the node hierarchy
 * @param fileInfo
 * @param api
 * @param options
 */
module.exports = function(fileInfo, api, options) {
    const j = api.jscodeshift;
    const superClasses = [];
    const leafClasses = [];
    let classes = ['Node'];
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


return api.jscodeshift(fileInfo.source);
}

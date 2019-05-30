const recast = require('recast');
const fs = require('fs');
const camelcase = require('camelcase');
const astTypes = require('ast-types');

module.exports = function(fileInfo, api, options) {
    const map = JSON.parse(fs.readFileSync('map.json', { encoding: 'utf-8' }));
    const j = api.jscodeshift;
    const r = j(fileInfo.source);
    const p = r.find(j.MethodDefinition);//, n => n.kind === "method");
    const funcs = [];
    p.forEach(p => {
	const n = p.value;
	const decl = p.parentPath.parentPath.parentPath.value;
        const spec = `${decl.id.name}.${n.key.name}`;
        const fname = camelcase(spec);
        let newName = map[spec];
        if(!newName) {
            map[spec] = fname;
            newName = fname;
        }
        //	process.stdout.write(`${spec}\t${fname}\n`);
        const f = { type: "FunctionDeclaration" };
        api.report(astTypes.getFieldNames(f).join(', '));
        const func=j.functionDeclaration(j.identifier(newName), n.value.params, n.value.body);
        funcs.push(func);
    });
    const f = j.file(j.program(funcs));
    api.report(recast.print(f).code);
    const program = r.paths()[0].value.program;
    program.body = [...program.body, ...funcs];
//    r.paths()[0].value.program.body.push(...funcs);
    api.report(r.toSource());
    //recast.print(r.paths()[0].value).code + '\n');

    return api.jscodeshift(fileInfo.source);/*
    .findVariableDeclarators('foo').module
  .renameTo('bar')
    .toSource();*/
}

//fs.writeFileSync('out.json', JSON.stringify(map), 'utf-8');

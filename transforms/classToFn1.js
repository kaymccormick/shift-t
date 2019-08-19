const recast = require('recast');
const fs = require('fs');
const camelcase = require('camelcase');
/**
 *
 * Part of an ill conceived attempt to convert methods to functions
 *
 * @param fileInfo
 * @param api
 * @param options
 */
module.exports = function(fileInfo, api, options) {
    const map = JSON.parse(fs.readFileSync('map.json', { encoding: 'utf-8' }));
    const j = api.jscodeshift;
    const r = j(fileInfo.source);
    const p = r.find(j.MethodDefinition);//, n => n.kind === "method");
    p.forEach(p => {
	const n = p.value;
	const decl = p.parentPath.parentPath.parentPath.value;
        const spec = `${decl.id.name}.${n.key.name}`;
        const fname = camelcase(spec);
        map[spec] = fname;
	// process.stdout.write(`${decl.id.name}.${n.key.name}\n`);
        // const fName = decl.id.name.replace(/^([A-Z][a-z]*)([A-Z][a-z]*)*$/,
        //const fname = camelcase(decl.id.name + n.key.name.substring(0, 1).toUpperCase() + n.key.name.substring(1));
	process.stdout.write(`${spec}\t${fname}\n`);
    });
    process.stdout.write(`${fileInfo.path}: ${p.size()}\n`);

    fs.writeFileSync('map.json', JSON.stringify(map), 'utf-8');

    return api.jscodeshift(fileInfo.source);/*
    .findVariableDeclarators('foo').module
  .renameTo('bar')
    .toSource();*/
}

//fs.writeFileSync('out.json', JSON.stringify(map), 'utf-8');

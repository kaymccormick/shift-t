import { getFieldNames, getFieldValue } from 'ast-types';

/**
 * An experiment to help with mutability stuff in source code
 * @param fileInfo
 * @param api
 * @param options
 */
module.exports = function (fileInfo, api, options) {
    const j = api.jscodeshift;
    const src = fileInfo.source;
    const r = j(src);
    const lets = r.find(j.VariableDeclaration,n=>n.kind === 'let');
    lets.forEach(p => {
        let parent = p.parent;
        while(parent.value.type !== 'BlockStatement') {
            parent = parent.parent;
        }
        p.get("declarations").value.forEach( n => {
            if(n.type === "VariableDeclarator") {
                api.report(n.id.name);
                j(parent).find(j.Identifier, n2 => n2.name === n.id.name).forEach(p2 => {

                    api.report(`${p2.parent.value.loc.start.line}:${p2.parent.value.loc.start.column}:${p2.parent.value.type}`);
                });
            } else {
                throw new Error(n.type);
            }
        });
    });
};


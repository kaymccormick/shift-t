const fs = require('fs');
const path = require('path');
const recast = require('recast');
const j = require('jscodeshift');
const astTypes = require('ast-types');
const assert = require('assert').strict;

function handleTemplateLiteral(node) {
    assert.equal(node.type, 'TemplateLiteral');
    const c = j(node);
    const scope = c.closestScope();
    if(scope.size()) {
        j.report(`scope: ${scope.paths()[0].value.type}`);
    }
    const ids = j(node).find(j.Identifier);
    const x = ids.map(p => p.value.id);
    j.report(`ids: ${x.join(', ')}`);
    node.expressions.forEach(e => {
        assert.equal(e.type, 'Identifier');
    });
    node.quasis.forEach(q => {
    });
}

exports.handleTemplateLiteral = handleTemplateLiteral;

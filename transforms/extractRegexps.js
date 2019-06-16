import { getFieldNames, getFieldValue, eachField } from 'ast-types';
import { handleTemplateLiteral } from '../src/templates';

/**
 * AN attempt to extract regular rxpressions from source code, but proves very complex
 * @param fileInfo
 * @param api
 * @param options
 */
module.exports = function (fileInfo, api, options) {
  const j = api.jscodeshift;
  const r = j(fileInfo.source);
  const regexpArgPaths = [];

  const p1 = r.find(j.NewExpression, n => n.callee.type === 'Identifier' && n.callee.name === 'RegExp');
  if (p1.size()) {
    p1.forEach((p) => {
      const n = p.value;
      const argPaths = p.get('arguments');
      regexpArgPaths.push(argPaths);
    });
  }
  regexpArgPaths.forEach((p) => {
      apwi.report(`${Object.keys(p).join(' ')}\n`);
      const scope = p.closestScope();
      if(scope.size()) {
          j.report(`scope: ${scope.paths()[0].value.type}`);
      }
      const [argnode] = p.value;
      if(argnode.type === 'TemplateLiteral') {
          handleTemplateLiteral(argnode);
      }
    api.report(`${argnode.loc.start.line}:${argnode.loc.start.column} ${argnode.type}`);
  });
  const p = r.find(j.Literal/* , n => n.regexp */);
  if (p.size()) {
    p.forEach((p) => {
      const n = p.value;
      getFieldNames(n).forEach((f) => {
        // api.report(`${f}\t${n[f]}\n`);
      });
      if (n.regex) {
        api.report(`${n.regex.pattern}`);
      }
    });
    // api.report(p);
  }
};

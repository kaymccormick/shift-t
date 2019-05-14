yarn run v1.16.0
$ /local/home/jade/JsDev/shift/node_modules/.bin/babel transform.js
"use strict";

module.exports = function (fileInfo, api, options) {
  const j = api.jscodeshift;
  const superClasses = [];
  let classes = ['Node'];
  const r = j(fileInfo.source);
  const paths = r.find(j.ClassDeclaration, p => p.superClass).paths();

  while (classes.length) {
    classes = classes.flatMap(superClass => {
      const subClasses = paths.filter(p => p.superClass.name === superClass).map(p => p.value.id.name);

      if (subClasses.length) {
        superClasses.push(superClass);
      }

      return subClasses;
    });
  } //         && classes.findIndex(x => p.superClass.name === x) !== -1).paths();
  //    classes = paths.map((n) => n.value.id.name);
  //const cl = x.find(j.ClassDeclaration, p => p.superClass && p.superClass.name === 'Element').paths().map((n) => n.value.id.name);


  return api.jscodeshift(fileInfo.source);
  /*
  .findVariableDeclarators('foo').module
  .renameTo('bar')
  .toSource();*/
};

Done in 0.76s.

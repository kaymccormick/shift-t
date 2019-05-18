module.exports = function(fileInfo, api, options) {
    const j = api.jscodeshift;
    const superClasses = [];
    const leafClasses = [];
    let classes = ['Node'];
    const r = j(fileInfo.source);
    const paths = r.find(j.MethodDefinition).paths();

    console.log(paths[11].value());
    return api.jscodeshift(fileInfo.source);/*
    .findVariableDeclarators('foo').module
  .renameTo('bar')
    .toSource();*/
}

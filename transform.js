module.exports = function(fileInfo, api, options) {
    const j = api.jscodeshift;
    const superClasses = [];
    const leafClasses = [];
    let classes = ['Node'];
    const r = j(fileInfo.source);
    const paths = r.find(j.ClassDeclaration, p => p.superClass).paths();
    while(classes.length) {
        console.log(classes.map);
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
    const m = j.methodDefinition();

   //         && classes.findIndex(x => p.superClass.name === x) !== -1).paths();
    //    classes = paths.map((n) => n.value.id.name);

    //const cl = x.find(j.ClassDeclaration, p => p.superClass && p.superClass.name === 'Element').paths().map((n) => n.value.id.name);

return api.jscodeshift(fileInfo.source);/*
    .findVariableDeclarators('foo').module
  .renameTo('bar')
    .toSource();*/
}

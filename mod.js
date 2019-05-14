module.exports = function(fileInfo, api, options) {
return api.jscodeshift(fileInfo.source);/*
    .findVariableDeclarators('foo').module
    .renameTo('bar')
    .toSource();*/
};

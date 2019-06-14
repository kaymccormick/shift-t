const fs = require('fs');
const path = require('path');

const sources = JSON.parse(fs.readFileSync(path.join(__dirname, '../sources_1.json'), { encoding: 'utf-8' }));
const out = {}
Object.keys(sources.file).forEach(file => {
    if(file === '/local/home/jade/JsDev/docutils-t/src/Parser.ts') {
    }
    if(true) {
        const outFile = {}
        out[file] = outFile
        const v = sources.file[file];
        Object.keys(v.classes).forEach(name => {
            const c = v.classes[name];
            const outClass = {}
            outFile[name] = outClass;
            if(c.superSpec) {
                let result;
                if(v.imported[c.superSpec]) {
                    const [module, default_] = v.imported[c.superSpec];
                    const y = sources.file[`${module}.ts`];
                    let name2;
                    if(default_) {
                        name2 = y.defaultExport;
                    } else {
                        name2 = y.exported[c.superSpec];
                    }
                    if(name2 === undefined) {
                        throw new Error(`${file} ${name} ${module} ${c.superSpec} ${default_} ${y.defaultExport}`);
                    }
                    result = [`${module}.ts`, name2];
                }
                outClass.superSpec = result;
            }
        });
    }
});
process.stdout.write(JSON.stringify(out));



const fs = require('fs');
const path = require('path');

const sources = JSON.parse(fs.readFileSync(path.join(__dirname, '../sources_1.json'), { encoding: 'utf-8' }));
const out = {}
const root = {};
Object.keys(sources.file).forEach(module => {
    let cur = root;
    module.split('/').forEach(unit => {
        if (!(unit in cur)) {
            cur[unit] = {}
        }
        cur = cur[unit];
    });
});
let here = root;
let pth = [];
function fn (here, pths) {
    if (Object.keys(here).findIndex(p => Object.keys(here[p]).length === 2) !== -1) {
        return [true, here, pths];
    }
    const k = Object.keys(here);
    for (let i = 0; i < k.length; i++) {
        const p = k[i];
        let fnr = fn(here[p], [...pths, p]);
        const [done, pth2, rpths] = fnr;
        if (done) {
            return [done, pth2, rpths];
        }
    }
    return [false, undefined, undefined]
}

const [done, p1, p2] = fn(root, []);

const commonDir = p2.join('/');

const outx = { module: {} };
const sources2 = { module: {} };
Object.keys(sources.file).forEach(file => {
    const m1 = './' + path.relative(commonDir, file);
    const x = {module: m1, imported: {}};
    sources2.module[m1] = x;
    Object.keys(sources.file[file].imported).forEach(name => {
        let element = sources.file[file].imported[name];
        const m2 = './' + path.relative(commonDir, element[0]);
        x.imported[name] = [m2, element[1]];
    });
    x.class = sources.file[file].classes;
});
fs.writeFileSync('sources_2.json', JSON.stringify(sources2, null, 4), 'utf-8');
const classes = {};
Object.keys(sources2.module).forEach(module => {
    let moduleElement = sources2.module[module];
    let c1 = moduleElement.class;
    Object.keys(c1).forEach(class_ => {
        const v = c1[class_];
        if(v.superSpec) {
            const imp = moduleElement.imported[v.superSpec];
            if(!imp) {
                console.log(v.superSpec);
            } else {
                const [ module, default_ ] = imp;
                console.log(module);
            }
        }
    })
});
/*
    const outFile = {}
    const v = sources.file[file];
    Object.keys(v.classes).forEach(name => {
        const c = v.classes[name];
        const outClass = {}
//        outFile[name] = outClass;
        f.class[name] = outClass;
        if(c.superSpec) {
            let result;
            if(v.imported[c.superSpec]) {
                const [module, default_] = v.imported[c.superSpec];
                const y = sources.file[module];
                let name2;
                if(default_) {
                    name2 = y.defaultExport;
                } else {
                    name2 = y.exported[c.superSpec];
                }

                if(name2 === undefined) {
                    throw new Error(`${file} ${name} ${module} ${c.superSpec} ${default_} ${y.defaultExport}`);
                }

                result = ['./' +path.relative(commonDir, module), name2];
            }
            outClass.superSpec = result;
        }
    });
});
*/
// Object.keys(outx.module).forEach(k => {
//     Object.keys(outx.module[k].class)
//         .filter(c => outx.module[k].class[c]
//             .indexOf(["/local/home/jade/JsDev/docutils-t/src/parsers/rst/states/RSTState", "RSTState"]) !== -1)
//         .forEach(c => {
//             console.log(c);
//         });
// });

//console.log(outx.module['/local/home/jade/JsDev/docutils-t/src/parsers/rst/states/RSTState'].class.RSTState)
//process.stdout.write(JSON.stringify(outx, null, 4));



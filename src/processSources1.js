const fs = require('fs');
const path = require('path');

/**
 
 *
 * @type {any}
 */
const sources = JSON.parse(fs.readFileSync(path.join(__dirname, '../sources_1.json'), { encoding: 'utf-8' }));
const out = {}
const root = {};
Object.keys(sources.module).forEach(module => {
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
Object.keys(sources.module).forEach(moduleName => {
    const m1 = './' + path.relative(commonDir, moduleName);
    outx.module[m1] = { class: {} }
    const f = outx.module[m1];
    const outFile = {}

    const v = sources.module[moduleName];
    Object.keys(v.classes).forEach(name => {
        const c = v.classes[name];
        const outClass = {}
//        outFile[name] = outClass;
        f.class[name] = outClass;
        if(c.superSpec) {
            let result;
            if(v.imported[c.superSpec]) {
                const [module, default_] = v.imported[c.superSpec];
                const y = sources.module[module];
                let name2;
                if(default_) {
                    name2 = y.defaultExport;
                    throw new Error(`no default exports, in ${moduleName}`);
                } else {
                    name2 = y.exported[c.superSpec];
                }
                if(name2 === undefined) {
                    throw new Error(`${moduleName} ${name} ${module} ${c.superSpec} ${default_} ${y.defaultExport}`);
                }

                result = ['./' +path.relative(commonDir, module), name2];
            }
            outClass.superSpec = result;
        }
    });
});

// Object.keys(outx.module).forEach(k => {
//     Object.keys(outx.module[k].class)
//         .filter(c => outx.module[k].class[c]
//             .indexOf(["/local/home/jade/JsDev/docutils-t/src/parsers/rst/states/RSTState", "RSTState"]) !== -1)
//         .forEach(c => {
//             console.log(c);
//         });
// });

//console.log(outx.module['/local/home/jade/JsDev/docutils-t/src/parsers/rst/states/RSTState'].class.RSTState)
process.stdout.write(JSON.stringify(outx, null, 4));



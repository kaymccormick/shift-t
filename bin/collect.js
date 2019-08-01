"use strict";
exports.__esModule = true;
/**
 * Main AST collector script.
 */
var bluebird_1 = require("bluebird");
var argparse_1 = require("argparse");
var fs_1 = require("fs");
var path_1 = require("path");
var util_1 = require("util");
var recast_1 = require("recast");
var entityCore_1 = require("classModel/lib/src/entityCore");
var Collector_1 = require("../src/Collector");
var Factory_1 = require("../src/TypeOrm/Factory");
var find_package_json_1 = require("find-package-json");
var process_1 = require("../src/process");
var RestClient_1 = require("../src/RestClient");
var winston_1 = require("winston");
var Factory_2 = require("classModel/lib/src/entity/core/Factory");
var v4_1 = require("uuid/v4");
var parser = new argparse_1.ArgumentParser({});
parser.addArgument(['--level'], { help: 'console log level' });
parser.addArgument(['dir'], { help: 'dir to search' });
var args = parser.parseArgs();
/*const myFormat = printf(({ level, message, label, timestamp, type, meta}) => {
    return `${timestamp} [${type}] ${level}: ${message} ${JSON.stringify(meta)}`;
});*/
try {
    fs_1["default"].unlinkSync('collect.log');
}
catch (error) {
}
var runUuid = v4_1["default"]();
var urlBase = 'http://localhost:7700/cme';
var consoleTransport = new winston_1["default"].transports.Console({ level: args.level || 'warn' });
var file = new winston_1["default"].transports.File({ level: 'debug', filename: 'collect.log' });
var loggerTranports = [consoleTransport, file /*, syslogTransport*/];
var logger = winston_1["default"].createLogger({ format: winston_1.format.json(), /*combine(timestamp(), myFormat),*/ transports: loggerTranports
});
var restClient = new RestClient_1.RestClient(urlBase, new Factory_2.Factory(logger));
var readdir = util_1.promisify(fs_1["default"].readdir);
var stat = util_1.promisify(fs_1["default"].stat);
function reportError(error) {
    logger.warn(error.toString() + '\n' + error.message.toString() + '\n', { error: error });
}
function processFile(args, project, fname, handleAst) {
    args.logger.debug('processFile', { type: 'functionInvocation', project: project.toPojo(), path: fname });
    var content = fs_1["default"].readFileSync(fname, { 'encoding': 'utf-8' });
    var ast = undefined;
    try {
        args.logger.debug('begin parsing');
        ast = recast_1.parse(content, {
            parser: require("recast/parsers/typescript")
        });
        args.logger.debug('end parsing');
    }
    catch (error) {
        reportError(new Error("unable to parse file " + fname + ": " + error.message));
        return bluebird_1.Promise.resolve(undefined);
    }
    if (ast === undefined) {
        reportError(new Error('no ast'));
        return bluebird_1.Promise.resolve(undefined);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (function () {
        args.logger.debug("begin process module " + fname + "\n");
        // PM5
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion,@typescript-eslint/no-explicit-any
        return Collector_1.processSourceModule(args, project, fname, ast).then(/*PM7*/ function () { return handleAst(args, project, fname, ast); }).then(/*PM8*/ function () {
            args.logger.debug("end process module " + fname + "\n");
        })["catch"](function (error) {
            logger.error('error3', { error: error });
            //reportError(error);
        });
    })();
}
function processEntry(args, project, path1, ent, processDir, handleAst) {
    var fname = path_1["default"].join(path1, ent.name);
    if (ent.isDirectory() && ent.name !== 'node_modules') {
        return processDir(args, project, fname, handleAst);
    }
    else if (ent.isFile() && /\.ts$/.test(ent.name)) {
        return processFile(args, project, fname, handleAst);
    }
    return bluebird_1.Promise.resolve(undefined);
}
function processDir(args, project, dir, handleAst) {
    //PM6
    args.logger.debug('ENTRY processDir', { dir: dir, project: project });
    return readdir(dir, { withFileTypes: true })
        .then(/*PM9*/ function (ents) {
        args.logger.debug('processDir got dir ents');
        return ents.map(function (ent) {
            return function () { return processEntry(args, project, dir, ent, processDir, handleAst); };
        })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .reduce(function (a, v) { return a.then(/*PM10*/ function () { return v(); }); }, bluebird_1.Promise.resolve(/*PM11*/ undefined));
    });
}
var dir = args.dir;
var f = find_package_json_1["default"](dir);
var next = f.next();
var packageInfo = next.value;
var pkgFile = next.filename;
var packageName = undefined;
if (packageInfo !== undefined) {
    packageName = packageInfo.name;
}
if (packageName === undefined) {
    throw new Error('need package name');
}
logger.info('begin run', { program: process.argv[1], dir: dir, packageName: packageName });
// PM1             /* PM12 */
Factory_1.createConnection(logger).then(function (connection) {
    /*try {
        const appTransport = new Transport({connection});
        logger.add(appTransport);
        } catch(error) {
        }*/
    return (function () {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        var handlers = [];
        logger.debug('loading collector modules');
        fs_1["default"].readdirSync(path_1["default"].join(__dirname, '../src/collect'), { withFileTypes: true })
            .forEach(function (entry) {
            var match = /^(.*)\.tsx?$/i.exec(entry.name);
            if (entry.isFile() && match) {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                var module_1 = require("../src/collect/" + match[0]);
                handlers.push(module_1["default"](connection));
            }
        });
        var projectRepo = connection.getRepository(entityCore_1["default"].Project);
        var getOrCreateProject = function (name, path) {
            return projectRepo.find({ name: name }).then(/*PM13*/ function (projects) {
                if (!projects.length) {
                    // PM3
                    var p = new entityCore_1["default"].Project(name, path, []);
                    p.packageJson = packageInfo;
                    return projectRepo.save(p);
                }
                else {
                    projects[0].packageJson = packageInfo;
                    return projectRepo.save(projects[0]);
                }
            });
        };
        /* No op? */
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        var handleAst = function (args, project, 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        fname, ast) {
            return bluebird_1.Promise.resolve(undefined);
        };
        var args = { connection: connection, restClient: restClient, logger: logger };
        //PM2
        return getOrCreateProject(packageName || '', path_1["default"].dirname(pkgFile)).then(/*PM15*/ function (project) {
            //PM4
            return stat(dir).then(/*PM16*/ function (stats) {
                logger.debug('got stats', { path: dir, stats: stats });
                if (stats.isFile()) {
                    return processFile(args, project, dir, handleAst);
                }
                else if (stats.isDirectory()) {
                    return processDir(args, project, dir, handleAst);
                }
                return bluebird_1.Promise.resolve(undefined);
            }).then(/*PM17*/ function () {
                args.logger.info('calling doProject', { project: project.toPojo() });
                return process_1.doProject(project, connection, args.logger).then(function () {
                    args.logger.debug("completed doProject for " + project.name);
                });
            })["catch"](function (error) {
                logger.error('error5', { error: error });
                process.exit(1);
            });
        });
    })().then(function () {
        logger.info('Closing database connection.');
        connection.close();
        return bluebird_1.Promise.resolve(undefined);
    });
})["catch"](function (error) {
    process.stderr.write(error.message + '\n');
    //logger.error(`Error: ${error.message}`, {error});
    //reportError(error);
});

const Transport = require('winston-transort');
const util = require('util');

module.exports = class ApplicationTransport extends Transport {
constructor(opt) {
super(opts);
}
}

log(info, callback) {
setImmediate(() => {
this.emit('logged', info);
});
callback();

}

Tail = require('tail').Tail;

tail = new Tail("collect.log");

tail.on("line", function(data) {
    const d = JSON.parse(data);
    if(d.iterationId) {
        console.log(data);
    }
});

tail.on("error", function(error) {
  console.log('ERROR: ', error);
});


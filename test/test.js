var util = require('util'),
    nodeunit = require('nodeunit');
var reporter = nodeunit.reporters.default;
//get process argument (test file path)
if (process=== undefined) {
    console.log('Node.js process cannot be empty.')
}
if (!util.isArray(process.argv)) {
    console.log('Node.js process arguments cannot be empty.')
}
if (process.argv.length<3) {
    console.log('Test argument is missing. File path cannot be empty at this context.')
}
reporter.run([process.argv[2]]);
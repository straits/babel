
const babylon = require('babylon');
const protofy = require('./bin/protofy');

module.exports = Object.assign({}, babylon, {
	parse( code, options={} ) {
		return babylon.parse( protofy.processString(code), options );
	}
});

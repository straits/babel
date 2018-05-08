
'use strict';

const babylon = require('babylon');

module.exports = Object.assign({}, babylon, {
	parse( code, options ) {
		code = code
			.replace(/((?:NaN|Infinity|-?(?:(?:\d+|\d*\.\d+)(?:[Ee][+-]?\d+)?)))\.\*/g, (match, num)=>`(${num}).*` )
			.replace(/\.\*\[/g, `[` )
			.replace(/\.\*/g, `._Straits.` )
			.replace(/use\s+traits\s+\*\s+from/mg, `_StraitsProvider:` );

		return babylon.parse( code, options );
	}
});

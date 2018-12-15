
'use strict';

const parser = require('@babel/parser');

module.exports = Object.assign({}, parser, {
	parse( code, options ) {
		code = code
			.replace(/((?:NaN|Infinity|-?(?:(?:\d+|\d*\.\d+)(?:[Ee][+-]?\d+)?)))\.\*/g, (match, num)=>`(${num}).*` )
			.replace(/\.\*/g, `._Straits.` )
			.replace(/use\s+traits\s+\*\s+from/mg, `_StraitsProvider:` );

		return parser.parse( code, options );
	}
});

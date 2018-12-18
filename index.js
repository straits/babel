
'use strict';

module.exports = {
	parse( code, options, parse ) {
		code = code
			.replace(/((?:NaN|Infinity|-?(?:(?:\d+|\d*\.\d+)(?:[Ee][+-]?\d+)?)))\.\*/g, (match, num)=>`(${num}).*` )
			.replace(/\.\*/g, `._Straits.` )
			.replace(/use\s+traits\s+\*\s+from/mg, `_StraitsProvider:` );

		return parse( code, options );
	}
};

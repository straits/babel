
'use strict';

const babylon = require('babylon');

module.exports = Object.assign({}, babylon, {
	parse( code, options={} ) {
		code = code
			.replace(/(\d+)\.\*/g, (match, num)=>`(${num}).*` )
			.replace(/\.\*\[/g, `[` )
			.replace(/\.\*/g, `._jsProtocol.` )
			.replace(/use\s+protocols\s+from/mg, `_jsProtocolProvider:` );

		return babylon.parse( code, options );
	}
});

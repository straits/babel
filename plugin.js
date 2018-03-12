
module.exports = function( arg ) {
	// console.log( Array.from(arguments) );
	// console.log( `plugin loaded` );
	// console.log( Object.keys(arg.types) );
	return {
		// pre( state ) { console.log(`PRE`); },
		visitor: {
			FunctionDeclaration( path, state ) {
				// console.log( `SL`, path, state );
			}
		}
	};
};


function assert( test, msg ) {
	if( ! test ) {
		throw new Error(msg);
	}
}

use traits * from Symbol;

assert( Array.prototype.*iterator === Array.prototype[Symbol.iterator] );
assert( Set.prototype.*iterator === Set.prototype[Symbol.iterator] );
assert( Map.prototype.*iterator === Map.prototype[Symbol.iterator] );

{
	const it = [5, 3, 4].*iterator();
	assert( it.next().value === 5 );
	assert( it.next().value === 3 );
	assert( it.next().value === 4 );
	assert( it.next().done );
}


const traits = {
	reverse: Symbol(),
};

use traits * from traits;
String.prototype.*reverse = function() {
	return this.split("").reverse().join("");
};

expect( `use traits * from traits;`.*reverse() ).to.equal( `;stiart morf * stiart esu` );
expect( 'use traits * from traits;'.*reverse() ).to.equal( `;stiart morf * stiart esu` );
expect( "use traits * from traits;".*reverse() ).to.equal( `;stiart morf * stiart esu` );
expect( `"hey".*reverse();`.*reverse() ).to.equal( `;)(esrever*."yeh"` );
expect( '"hey".*reverse();'.*reverse() ).to.equal( `;)(esrever*."yeh"` );
expect( "\"hey\".*reverse();".*reverse() ).to.equal( `;)(esrever*."yeh"` );

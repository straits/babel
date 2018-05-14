
const traits = {
	x: Symbol(),
	y: Symbol(),
};

use traits * from traits;

const obj = {};
obj.*x = 1;
obj[traits.y] = 2;

expect( obj.propertyIsEnumerable(traits.x) ).to.equal( false, `.*x is enumerable` );
expect( obj.propertyIsEnumerable(traits.y) ).to.equal( true, `.*y is not enumerable` );

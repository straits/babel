
const traits = {
	x: Symbol(`x`),
	y: Symbol(`y`)
};

use traits * from traits;

const obj = {};
obj.*x = {};
obj.*x.*x = {};
obj.*x.*x.*y = obj.*x.*x.*x = obj.*x;
obj.*y = obj.*x.*x.*y;

expect( obj.*y ).to.equal( obj.*x );
expect( obj.*x.*x.*x ).to.equal( obj.*x );

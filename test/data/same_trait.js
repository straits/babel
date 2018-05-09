
const symbolsA = {
	a: Symbol(`a`),
	x: Symbol(`x`),
};
const symbolsB = {
	b: Symbol(`b`),
	x: symbolsA.x,
};

use traits * from symbolsA;
use traits * from symbolsB;
use traits * from symbolsB;

Object.*a = 1;
Object.*b = 1;
Object.*x = 1;


use traits * from Symbol;

Object.*iterator = 1;

const traits = {
	x: Symbol(),
	y: Symbol(),
};
use traits * from traits;

Object.*x = 1;
Object.*y = 1;
Object.*iterator = 1;

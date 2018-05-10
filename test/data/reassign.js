
const traits = {
	x: Symbol(`x`)
};

use traits * from traits;

const obj = {};
obj.*x = 1;
obj.*x = 2;


const traits1 = {
	x: Symbol(),
};
use traits * from traits1;

Object.*x = 1;

{
	const traits2 = {
		y: Symbol(),
	};
	use traits * from traits2;

	Object.*x = 2;
	Object.*y = 3;
}

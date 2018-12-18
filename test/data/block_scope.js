
const traits1 = {
	x: Symbol(),
};
const traits2 = {
	x: Symbol(),
};

// setting two different values to `Object[traits1.x]` and `Object[traits2.x]`
{
	use traits * from traits1;
	Object.*x = 2;
}
{
	use traits * from traits2;
	Object.*x = 5;
}

// getters for the two traits
function f1() {
	use traits * from traits1;
	return Object.*x;
}
function f2() {
	use traits * from traits2;
	return Object.*x;
}

main( ()=>{
	const result = f1() + f2();
	expect( result ).to.equal( 7 );
	return result;
});


const symbolsA = {
	x: Symbol(`x`)
};
const symbolsB = {
	x: Symbol(`x`)
};

use traits * from symbolsA;
use traits * from symbolsB;

main( ()=>{
	const obj = {};
	obj.*x = ()=>1;
	return obj.*x();
});

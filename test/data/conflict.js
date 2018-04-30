
const symbolsA = {
	x: Symbol(`x`)
};
const symbolsB = {
	x: Symbol(`x`)
};

use protocols from symbolsA;
use protocols from symbolsB;

main( ()=>{
	const obj = {};
	obj.*x = ()=>1;
	return obj.*x();
});

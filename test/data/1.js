
const symbols = {
	one: Symbol(`one`)
};

use protocols from symbols;

main( ()=>{
	const obj = {};
	obj.*one = ()=>1;
	return obj.*one();
});

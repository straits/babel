
const symbols = {
	one: Symbol(`one`)
};

use traits * from symbols;

main( ()=>{
	const obj = {};
	obj.*one = ()=>1;
	return obj.*one();
});

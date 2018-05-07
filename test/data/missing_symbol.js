
const symbols = {
};

use traits * from symbols;

main( ()=>{
	const obj = {};
	obj.*x = ()=>1;
	return obj.*x();
});

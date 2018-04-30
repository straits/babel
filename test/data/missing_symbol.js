
const symbols = {
};

use protocols from symbols;

main( ()=>{
	const obj = {};
	obj.*x = ()=>1;
	return obj.*x();
});

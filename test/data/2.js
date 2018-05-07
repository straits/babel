
const symbols = {
	one: Symbol(`one`),
	two: Symbol(`two`),
};

use traits * from symbols;

class C {}
C.prototype.*two = ()=>2;

main( ()=>{
	const obj = new C();
	obj.*one = ()=>1;
	return obj.*two();
});

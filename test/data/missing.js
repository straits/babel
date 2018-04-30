
const symbols = {
	x: Symbol(`x`)
};

main( ()=>{
	const obj = {};
	obj.*x = ()=>1;
	return obj.*x();
});

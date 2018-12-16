
/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^symbols$" }] */
const symbols = {
	x: Symbol(`x`)
};

main( ()=>{
	const obj = {};
	obj.*x = ()=>1;
	return obj.*x();
});


const traits = {
	x: Symbol(`x`)
};

use traits * from traits;

const reverse = str=>str.split('').reverse().join('');

expect(`use traits * from traits;`).to.equal( reverse(`;stiart morf * stiart esu`) );
expect(`obj.*x;`).to.equal( reverse(`;x*.jbo`) );

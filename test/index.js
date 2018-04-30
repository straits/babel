
const fs = require('fs');
const babel = require('babel-core');
const chai = require('chai');

const {expect} = chai;


function parse( code ) {
	return babel.transform( code, {
		"parserOpts": {
			"parser": "./index.js"
		}
	}).code;
}

function transform( code ) {
	code = babel.transform( code, {
		"parserOpts": {
			"parser": "./index.js"
		},
		"plugins": [
			"./plugin.js",
		]
	}).code;

	return code;
}

function transformFile( path ) {
	return transform( fs.readFileSync(path, `utf8`) );
}
function evalFile( path ) {
	const code = transform( fs.readFileSync(path, `utf8`) );
	// console.log( code );

	const fn = new Function( 'main', code );

	let result;
	fn( (mainFn)=>{
		result = mainFn();
	});
	return result;
}

function parseTest( code, thrownByParse=null, thrownByTransform=thrownByParse ) {
	return {
		code,
		thrownByParse,
		thrownByTransform,
	};
}
const parseTests = [
	parseTest(`a.b`,			),
	parseTest(`.*`,	/Unexpected token/,		),
	parseTest(`a.*()`,	/Unexpected token/,		),
	parseTest(`a.*(b)`,	/Unexpected token/,		),
	parseTest(`.*b`,	/Unexpected token/,		),
	parseTest(`a.*b`,	null,	/\.\* used, without using any protocols\./	),
	parseTest(`use protocols;`,	/Unexpected token/,		),
	parseTest(`use protocols from;`,	null,	/"use protocols from" requires an expression./	),
	parseTest(`use something from {};`,	/Unexpected token/,		),
	parseTest(`use protocols from {};`,	null,	/"use protocols from" requires an expression./	),
	parseTest(`use protocols from ({});`,			),
	parseTest(`use protocols from ({}); a.*b`,			),
	parseTest(`a.*[b]`,			),
];

describe(`js-protocols-babylon`, function(){
	it(`Parses correctly`, function(){
		parseTests.forEach( ({code, thrownByParse})=>{
			if( thrownByParse ) {
				expect( ()=>parse(code) ).to.throw(thrownByParse);
			} else {
				expect( ()=>parse(code) ).not.to.throw();
			}
		});
	});
});

describe(`js-protocols-babylon/plugin`, function(){
	it(`Parses correctly`, function(){
		parseTests.forEach( ({code, thrownByTransform})=>{
			if( thrownByTransform ) {
				expect( ()=>transform(code) ).to.throw(thrownByTransform);
			} else {
				expect( ()=>transform(code) ).not.to.throw();
			}
		});
	});

	it(`Transpiles correctly`, function(){
		expect( evalFile(`./test/data/1.js`) ).to.equal( 1 );
		expect( evalFile(`./test/data/2.js`) ).to.equal( 2 );
		expect( evalFile(`./test/data/3.js`) ).to.equal( 3 );
		expect( ()=>evalFile(`./test/data/conflict.js`) ).to.throw(/Symbol x offered by multiple symbol sets./);
		expect( ()=>evalFile(`./test/data/missing.js`) ).to.throw(/\.\* used, without using any protocols./);
		expect( ()=>evalFile(`./test/data/missing_symbol.js`) ).to.throw(/No symbol set is providing symbol x/);
	});
});
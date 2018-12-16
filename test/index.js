
'use strict';

const assert = require('assert');
const fs = require('fs');
const babel = require('@babel/core');
const chai = require('chai');
const straitsParser = require('../index.js');

const {expect} = chai;


function parse( code ) {
	return babel.transform( code, {
		"plugins": [
			{ parserOverride:straitsParser.parse }
		]
	}).code;
}

function transform( code ) {
	return babel.transform( code, {
		"plugins": [
			{ parserOverride:straitsParser.parse },
			"./plugin.js",
		]
	}).code;
}

function evalFile( path ) {
	const code = transform( fs.readFileSync(path, `utf8`) );
	// console.log( code );

	const fn = new Function( 'console', 'assert', 'expect', 'main', code );

	let result;
	fn( console, assert, expect, (mainFn)=>{
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
	parseTest(`a.b`			),
	parseTest(`.*`,	/Unexpected token/		),
	parseTest(`a.*()`,	/Unexpected token/		),
	parseTest(`a.*(b)`,	/Unexpected token/		),
	parseTest(`.*b`,	/Unexpected token/		),
	parseTest(`a.*b`,	null,	/\.\* used outside a `use traits` scope\./	),
	parseTest(`use traits from ({});`,	/Unexpected token/		),
	parseTest(`use traits *;`,	/Unexpected token/		),
	parseTest(`use traits * from;`,	null,	/`use traits` requires an expression./	),
	parseTest(`use something * from ({});`,	/Unexpected token/		),
	parseTest(`use traits * from {};`,	null,	/`use traits` requires an expression./	),
	parseTest(`use traits * from ({});`			),
	parseTest(`use traits * from ({}); a.*b`			),
	parseTest(`use traits * from ({}); 3.*b`			),
	parseTest(`use traits * from ({}); -3.*b`			),
	parseTest(`use traits * from ({}); 3e3.*b`			),
	parseTest(`use traits * from ({}); 3e-3.*b`			),
	parseTest(`use traits * from ({}); 3.5.*b`			),
	parseTest(`use traits * from ({}); 3.5E+1.*b`			),
	parseTest(`use traits * from ({}); NaN.*b`			),
];

describe(`@straits/babel`, function(){
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

describe(`@straits/babel/plugin`, function(){
	it(`Transpiles correctly`, function(){
		parseTests.forEach( ({code, thrownByTransform})=>{
			if( thrownByTransform ) {
				expect( ()=>transform(code) ).to.throw(thrownByTransform);
			} else {
				expect( ()=>transform(code) ).not.to.throw();
			}
		});
	});

	it(`Works correctly with simple cases`, function(){
		expect( evalFile(`./test/data/1.js`) ).to.equal( 1 );
		expect( evalFile(`./test/data/2.js`) ).to.equal( 2 );
		expect( evalFile(`./test/data/3.js`) ).to.equal( 3 );
		expect( ()=>evalFile(`./test/data/undefined_traits.js`) ).to.throw(/null cannot be used as a trait set./);
		expect( ()=>evalFile(`./test/data/conflict.js`) ).to.throw(/Symbol x offered by multiple trait sets./);
		expect( ()=>evalFile(`./test/data/missing.js`) ).to.throw(/\.\* used outside a `use traits` scope\./);
		expect( ()=>evalFile(`./test/data/missing_symbol.js`) ).to.throw(/No trait set is providing symbol x/);
	});

	it(`Works with Symbol`, function(){
		expect( ()=>evalFile(`./test/data/symbol.js`) ).not.to.throw();
	});

	it(`Same trait doesn't conflict with itself`, function(){
		expect( ()=>evalFile(`./test/data/same_trait.js`) ).not.to.throw();
	});

	it(`Traits can be used right after their definition`, function(){
		expect( ()=>evalFile(`./test/data/use_traits_after_definition.js`) ).not.to.throw();
	});

	it(`Traits work in subscopes`, function(){
		expect( ()=>evalFile(`./test/data/subscope.js`) ).not.to.throw();
	});

	it(`Traits assigned with .* are not enumerable`, function(){
		expect( ()=>evalFile(`./test/data/traits_not_enumerable.js`) ).not.to.throw();
	});

	it(`Traits can reassigned`, function(){
		expect( ()=>evalFile(`./test/data/reassign.js`) ).not.to.throw();
	});

	it(`Strings don't change`, function(){
		expect( ()=>evalFile(`./test/data/strings_dont_change.js`) ).not.to.throw();
	});

	it(`Trait of a trait`, function(){
		expect( ()=>evalFile(`./test/data/trait_of_trait.js`) ).not.to.throw();
	});

	it(`Strings aren't changed`, function(){
		// NOTE, TODO: some spaces from the original string might go lost...
		expect( ()=>evalFile(`./test/data/strings_not_changed.js`) ).not.to.throw();
	});

	it(`Labels work normally`, function(){
		expect( ()=>evalFile(`./test/data/label.js`) ).not.to.throw();
	});
});

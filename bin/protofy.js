#!/usr/bin/env node

'use strict';

const assert = require('assert');

function parse( str, state ) {
	const pos = state || {i:0, row:1, col:1};
	const startPos = { row:pos.row, col:pos.col };
	const tree = [];
	const globalScope = pos !== state;

	// console.log( `${pos.row}:${pos.col}` );

	for( let i = pos.i; i < str.length; ++i ) {
		const ch = str[i];

		if( ch === '\n' ) {
			++ pos.row;
			pos.col = 1;
		} else {
			++ pos.col;
		}

		if( ch === '{' /*}*/ ) {
			// console.log( str.substring(pos.i, i) );
			tree.push( str.substring(pos.i, i) );
			pos.i = i+1;
			{
				const subtree = parse(str, pos);
				tree.push( subtree );

				assert( str[pos.i] === /*{*/ '}', /*{*/ `parse() returned from recursion at ${pos.row}:${pos.col} without finding a }` );
			}
			i = pos.i = pos.i+1;
			--i;
			continue;
		}

		if( ch === /*{*/ '}' ) {
			assert( pos === state, /*{*/ `parse() found a closed } at ${pos.row}:${pos.col} without a matching {` /*}*/ );

			// console.log( str.substring(pos.i, i) );
			tree.push( str.substring(pos.i, i) );
			pos.i = i;

			return tree;
		}
	}

	assert( globalScope, /*{*/ `parse() didn't find a } at ${pos.row}:${pos.col}, for the one opened at ${startPos.row}:${startPos.col}` );

	tree.push( str.substring(pos.i) );

	return tree;
}

function replaceProtocols( tree, ns ) {
	const useProtoRe = /use\s+protocols\s+from\s+(const\s+|var\s+|let\s+|)(\w+(\.\w+)*)/g;
	const dotStarRe = /\.\*\s*(\w+)/g;

	// collecting namespaces
	tree.forEach( (node)=>{
		if( typeof node === 'string' ) {

			let match;
			while( match = useProtoRe.exec(node) ) {
				ns = [].concat( match[2], ns );
			}

			/*
			const match = node.match( useProtoRe );

			if( match ) {
				ns = [].concat( match[2], ns );
				// node.replace( useProtoRe, match[1]+match[2] );
			}
			*/
		}
	});

	const prependNS = (methodName)=>{
		if( ns.length === 0 ) {
			return `[${methodName}]`;
		}

		return `[` + ns.map( (n)=>`${n}.${methodName}` ).join(' || ') + `]`;
	};

	return tree.map( (node)=>{
		if( typeof node === 'string' ) {
			node = node.replace( useProtoRe, `$1$2` );
			node = node.replace( dotStarRe, (match, methodName)=>prependNS(methodName) );
		}
		else {
			node = replaceProtocols( node, ns );
		}
		return node;
	});
}

function flattenTree( tree, codePieces=[] ) {
	tree.forEach( (node)=>{
		if( typeof node === 'string' ) {
			codePieces.push( node );
		}
		else {
			codePieces.push( `{` );
			flattenTree(node, codePieces)
			codePieces.push( `}` );
		}
	});
	return codePieces;
}

function processString( str ) {
	let tree = parse( str );
	tree = replaceProtocols( tree, [] );
	return flattenTree( tree ).join('');
}

async function processFile( file ) {
	const fse = require('fs-extra');
	const str = await fse.readFile( file );
	return processString( str.toString('utf8') );
}

module.exports = {
	processString,
	processFile
};

if( require.main === module ) {
	async function main( inputFile ) {
		const out = await processFile( inputFile );
		console.log( out );
	}

	const inputFile = process.argv[2] || process.argv[1];
	main(inputFile).catch( (err)=>{
		console.error(`Main error: ${err.stack}`);
	});
}

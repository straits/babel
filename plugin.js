
const assert = require('assert');

const babylon = require('babylon');
const template = require('babel-template');
const generate = require('babel-generator').default;
const t = require('babel-types');

function defaultGet( key, defaultConstructor ) {
	if( this.has(key) ) {
		return this.get( key );
	} else {
		const value = defaultConstructor( key );
		this.set( key, value );
		return value;
	}
}

// a namespace where we're gonna look for symbols
// it must be composed by at least one expression used in a `use protocols from` statement.
class ProtocolNamespace {
	constructor( path ) {
		assert( path.node.type === 'LabeledStatement' );
		assert( path.parent.type === 'BlockStatement' || path.parent.type === 'Program', `"use protocols from" must be placed in a block, or in the outermost scope.` );

		this.path = path;
		this.blockPath = path.parentPath;
		this.providers = new Set();
		this.symbols = new Map();

		this.addProvider( path );
	}

	addProvider( path ) {
		this.providers.add( path );
	}

	provideSymbol( symName ) {
		if( this.symbols.has(symName) ) {
			return this.symbols.get(symName);
		}
		const newSymbolIdentifier = this.blockPath.scope.generateUidIdentifier( symName );
		this.symbols.set( symName, newSymbolIdentifier );
		return newSymbolIdentifier;
	}

	finalize( getSymbolIdentifier ) {
		const providingExpressions =  Array.from(this.providers).map( p=>p.node.body.expression );

		if( ! this.symbols.size ) {
			return;
		}

		this.path.insertBefore(
			t.variableDeclaration(
				`const`,
				Array.from(this.symbols.entries()).map( ([name, id])=>{
					return t.variableDeclarator(
						id,
						t.callExpression(
							getSymbolIdentifier,
							[
								t.stringLiteral(name),
								...providingExpressions,
							]
						)
					);
				})
			)
		);
	}
	remove() {
		this.path.remove();
	}
}

module.exports = function( arg ) {
	return {
		visitor: {
			Program( path, state ) {
				const protocolNamespaces = new Map();
				const getSymbolIdentifier = path.scope.generateUidIdentifier(`getSymbol`);

				// 1. marking all the blocks that contain a `_jsProtocolProvider` expression, and removing those.
				path.traverse({
					LabeledStatement( path ) {
						const node = path.node;
						if( node.label.name !== '_jsProtocolProvider' ) {
							return;
						}

						assert( path.parent.type === 'BlockStatement' || path.parent.type === 'Program', `"use protocols from" must be placed in a block, or in the outermost scope.` );

						const protocolNS = defaultGet.call( protocolNamespaces, path.parentPath, ()=>new ProtocolNamespace(path) );
					}
				});


				// if we didn't find any `use protocols of` statements, we can return
				// TODO: actually, we should fix `.*` anyways, but I'll code that that another day :P
				if( protocolNamespaces.size === 0 ) {
					return;
				}

				// if we found at least one `use protocols of` statement, let's generate the `getSymbol` function
				const getSymbolBuilder = template(`
function GET_SYMBOL( targetSymName, ...symbolSets ) {
	let symbol;
	symbolSets.forEach( symbolSet=>{
		for( let symName in symbolSet ) {
			if( symName === targetSymName ) {
				if( !! symbol ) {
					throw new Error(\`Symbol \${targetSymName} offered by multiple symbol sets.\`);
				}
				symbol = symbolSet[targetSymName];
			}
		}
	});
	if( ! symbol ) {
		throw new Error(\`No symbol set is providing symbol \${targetSymName}.\`);
	}
	return symbol;
}
				`)

				path.unshiftContainer('body', getSymbolBuilder({ GET_SYMBOL:getSymbolIdentifier }) );

				// 2. for each `use protocols from ...` expression we found, let's iterate backwards: if we see that some other `use protocols from ...` was defined in a higher scope, let's apply that expression here as well
				for( const [blockPath, protocolNS] of protocolNamespaces ) {
					let parentPath = blockPath.parentPath;
					while( parentPath ) {
						if( protocolNamespaces.has(parentPath) ) {
							protocolNamespaces.get(parentPath).providers.forEach( p=>{
								protocolNS.addProvider( p );
							});
						}

						parentPath = parentPath.parentPath;
					}
				}

				// 3. for each `use protocols from ...` expression we found, let's find all the protocols used within them (stuff after `.*`)
				//    instead of `.*` we'll find `._jsProtocol.`: let's also remove that bit
				for( const [blockPath, protocolNS] of protocolNamespaces ) {
					blockPath.traverse({
						BlockStatement( subBlock ) {
							if( protocolNamespaces.has(subBlock) ) {
								subBlock.skip();
							}
						},
						Identifier( path ) {
							const node = path.node;
							if( node.name !== '_jsProtocol' ) {
								return;
							}

							// parentPath is the `(...)._jsProtocol` expression
							// symbolPath is the `(...).${symbol}` one
							const parentPath = path.parentPath;
							let symbolPath;
							{
								const parent = parentPath.node;
								assert( parent.type === 'MemberExpression' );
								assert( parent.computed === false );

								const prop = parent.property;
								assert( prop === node );

								symbolPath = parentPath.parentPath;
							}

							{
								const symbolParent = symbolPath.node;
								assert( symbolParent.type === 'MemberExpression' );
								assert( symbolParent.object === parentPath.node );
							}

							/*
							// removing the `._jsProtocol` part
							{
								parentPath.replaceWith(
									parentPath.node.object
								);
							}
							*/

							// fixing the cases where the original code was not `(...).*${symbol}`, but something else, like `.*(x.y)`
							if( symbolPath.node.computed ) {
								parentPath.replaceWith( parentPath.node.object );
								return;
							}

							// generating a new unique identifier for the symbol, and replacing the current symbol id with it:
							// from `(...).${symbolName}` to `(...)[${newSymbolName}]`
							const prop = symbolPath.node.property;
							const newSymbolIdentifier = protocolNS.provideSymbol( prop.name );
							symbolPath.replaceWith(
								t.memberExpression(
									parentPath.node.object,
									newSymbolIdentifier,
									true
								)
							);
						}
					});
				}

				for( const protocolNS of protocolNamespaces.values() ) {
					protocolNS.finalize( getSymbolIdentifier );
				}
				for( const protocolNS of protocolNamespaces.values() ) {
					protocolNS.remove();
				}
			}
		}
	};
};

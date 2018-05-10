
'use strict';

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
// it must be composed by at least one expression used in a `use traits * from` statement.
class TraitNamespace {
	constructor( path ) {
		assert( path.node.type === 'LabeledStatement' );
		assert( path.parent.type === 'BlockStatement' || path.parent.type === 'Program', `"use traits * from" must be placed in a block, or in the outermost scope.` );

		this.path = path;
		this.blockPath = path.parentPath;
		this.providers = new Set();
		this.symbols = new Map();

		this.addProvider( path );
	}

	addProvider( path ) {
		this.providers.add( path );

		if( ! path.node.body.expression ) {
			throw path.buildCodeFrameError(`"use traits * from" requires an expression.`);
		}
	}

	provideSymbol( symName ) {
		if( this.symbols.has(symName) ) {
			return this.symbols.get(symName);
		}
		const newSymbolIdentifier = this.blockPath.scope.generateUidIdentifier( symName );
		this.symbols.set( symName, newSymbolIdentifier );
		return newSymbolIdentifier;
	}

	writeCheck( testTraitSetIdentifier ) {
		this.providers.forEach( (providerPath)=>{
			providerPath.insertBefore(
				t.expressionStatement(
					t.callExpression(
						testTraitSetIdentifier,
						[
							providerPath.node.body.expression
						]
					)
				)
			);
		});
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

function finalCheck( path ) {
	// making sure that no `_Straits` was left unresolved
	path.traverse({
		Identifier( path ) {
			if( path.node.name === `_Straits` ) {
				throw path.buildCodeFrameError(`.* used, without using any traits.`);
			}
		}
	});
}

module.exports = function( arg ) {
	return {
		visitor: {
			Program( path, state ) {
				const traitNamespaces = new Map();
				const testTraitSetIdentifier = path.scope.generateUidIdentifier(`testTraitSet`);
				const getSymbolIdentifier = path.scope.generateUidIdentifier(`getSymbol`);
				const implSymbolIdentifier = path.scope.generateUidIdentifier(`implSymbol`);

				// 1. marking all the blocks that contain a `_StraitsProvider` expression, and removing those.
				path.traverse({
					LabeledStatement( path ) {
						const node = path.node;
						if( node.label.name !== '_StraitsProvider' ) {
							return;
						}

						assert( path.parent.type === 'BlockStatement' || path.parent.type === 'Program', `"use traits * from" must be placed in a block, or in the outermost scope.` );

						const traitNS = defaultGet.call( traitNamespaces, path.parentPath, ()=>new TraitNamespace(path) );
						traitNS.addProvider( path );
					}
				});

				// if we didn't find any `use traits * from` statements, we can return
				// TODO: actually, we should fix `.*` anyways, but I'll code that that another day :P
				if( traitNamespaces.size === 0 ) {
					finalCheck( path ); // making sure that everythign is fine
					return;
				}

				// prepending the `testTraitSet` function to the top of the file
				// it makes sure that all the `use traits * from` statements must have a valid object as expression
				{
					const testTraitBuilder = template(`
function TEST_TRAIT_SET( traitSet ) {
	if( ! traitSet || typeof traitSet === 'boolean' || typeof traitSet === 'number' || typeof traitSet === 'string' ) {
		throw new Error(\`\${traitSet} cannot be used as a trait set.\`);
	}
}
					`);
					path.unshiftContainer('body', testTraitBuilder({ TEST_TRAIT_SET:testTraitSetIdentifier }) );
				}

				// prepending the `getSymbol` function to the top of the file
				// it resolves traits
				{
					const getSymbolBuilder = template(`
function GET_SYMBOL( targetSymName, ...traitSets ) {
	let symbol;
	traitSets.forEach( traitSet=>{
		const sym = traitSet[targetSymName];
		if( typeof sym === 'symbol' ) {
			if( !! symbol && symbol !== sym ) {
				throw new Error(\`Symbol \${targetSymName} offered by multiple trait sets.\`);
			}
			symbol = sym;
		}
	});
	if( ! symbol ) {
		throw new Error(\`No trait set is providing symbol \${targetSymName}.\`);
	}
	return symbol;
}
					`);
					path.unshiftContainer('body', getSymbolBuilder({ GET_SYMBOL:getSymbolIdentifier }) );
				}

				// prepending the `implSymbol` function to the top of the file
				// it's used to implement traits
				{
					const implSymbolBuilder = template(`
function IMPL_SYMBOL( target, sym, value ) {
	Object.defineProperty( target, sym, {value, configurable:true} );
	return target[sym];
}
					`);
					path.unshiftContainer('body', implSymbolBuilder({ IMPL_SYMBOL:implSymbolIdentifier }) );
				}

				// 2. for each `use traits * from ...` expression we found, let's iterate backwards: if we see that some other `use traits * from ...` was defined in a higher scope, let's apply that expression here as well
				for( const [blockPath, traitNS] of traitNamespaces ) {
					let parentPath = blockPath.parentPath;
					while( parentPath ) {
						if( traitNamespaces.has(parentPath) ) {
							traitNamespaces.get(parentPath).providers.forEach( p=>{
								traitNS.addProvider( p );
							});
						}

						parentPath = parentPath.parentPath;
					}
				}

				// 3. for each `use traits * from ...` expression we found, let's find all the traits used within them (stuff after `.*`)
				//    instead of `.*` we'll find `._Straits.`: `a.*b` => `a._Straits.b`
				for( const [blockPath, traitNS] of traitNamespaces ) {
					blockPath.traverse({
						BlockStatement( subBlock ) {
							if( traitNamespaces.has(subBlock) ) {
								subBlock.skip();
							}
						},
						Identifier( path ) {
							const node = path.node;
							if( node.name !== '_Straits' ) {
								return;
							}

							// straitsOperatorPath is the `(...)._Straits` expression
							// traitPath is the `(...).${symbol}` one
							// parentPath is the expression above `traitPath`. is that an assignment?
							const straitsOperatorPath = path.parentPath;
							const traitPath = (()=>{
								const straitsOperator = straitsOperatorPath.node;
								assert( straitsOperator.type === 'MemberExpression' );
								assert( straitsOperator.computed === false );

								const prop = straitsOperator.property;
								assert( prop === node );

								return straitsOperatorPath.parentPath;
							})();
							const parentPath = traitPath.parentPath;

							{
								const traitParent = traitPath.node;
								assert( traitParent.type === 'MemberExpression' );
								assert( traitParent.object === straitsOperatorPath.node );
							}

							// fixing the cases where the original code was not `(...).*${symbol}`, but `.*[x.y]`
							if( traitPath.node.computed ) {
								straitsOperatorPath.replaceWith( straitsOperatorPath.node.object );
								return;
							}

							// generating a new unique identifier for the symbol, and replacing the current symbol id with it:
							// from `(...).${symbolName}` to `(...)[${newSymbolName}]`
							const prop = traitPath.node.property;
							const newSymbolIdentifier = traitNS.provideSymbol( prop.name );
							traitPath.replaceWith(
								t.memberExpression(
									straitsOperatorPath.node.object,
									newSymbolIdentifier,
									true
								)
							);

							// if the `.*` operator is used in an assignment (i.e. `a.*b = c` ), wa want to use `Object.defineProperty`
							if( parentPath.type === 'AssignmentExpression' && parentPath.node.operator === '=' && parentPath.node.left === traitPath.node ) {
								parentPath.replaceWith(
									t.callExpression(
										implSymbolIdentifier,
										[
											straitsOperatorPath.node.object,
											newSymbolIdentifier,
											parentPath.node.right,
										]
									)
								)
							}
						}
					});
				}

				for( const traitNS of traitNamespaces.values() ) {
					traitNS.writeCheck( testTraitSetIdentifier );
					traitNS.finalize( getSymbolIdentifier );
				}
				for( const traitNS of traitNamespaces.values() ) {
					traitNS.remove();
				}

				// turning `_Straits` within strings into `.*`
				// NOTE: if a string had `_Straits` originally, that'd be screwed up, escape those, maybe?
				function cleanString( str ) {
					return str
						.replace(/\._Straits\.?/g, `.*` )
						.replace(/_StraitsProvider:/g,  `use traits * from` );
				}
				path.traverse({
					StringLiteral( literalPath ) {
						const str = literalPath.node.value;
						const newStr = cleanString( str );
						if( newStr === str ) {
							return;
						}

						literalPath.replaceWith(
							t.stringLiteral(
								newStr
							)
						);
					},
					TemplateElement( elementPath ) {
						const {value, tail} = elementPath.node;
						const newValue = {
							raw: cleanString( value.raw ),
							cooked: cleanString( value.cooked ),
						};
						if( newValue.raw === value.raw || newValue.cooked === value.cooked ) {
							return;
						}

						elementPath.replaceWith(
							t.templateElement(
								newValue,
								tail
							)
						);
					},
				});

				finalCheck( path ); // making sure that everythign is fine
			}
		}
	};
};

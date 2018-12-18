
'use strict';

const assert = require('assert');
//const generate = require('@babel/generator').default;

// turning `_Straits` within strings into `.*`
// NOTE: if a string had `_Straits` originally, that'd be screwed up, escape those, maybe?
function cleanString( str ) {
	return str
		.replace(/\._Straits\.?/g, `.*` )
		.replace(/_StraitsProvider:/g,  `use traits * from` );
}

// prepend to `path` the functions we need to use traits
function generateStraitsFunctions( {template}, path ) {
	// testTraitSet( traitSet )
	// it makes sure that all the `use traits * from` statements have a valid object as expression
	const testTraitBuilder = template(`
function TEST_TRAIT_SET( traitSet ) {
	if( ! traitSet || typeof traitSet === 'boolean' || typeof traitSet === 'number' || typeof traitSet === 'string' ) {
		throw new Error(\`\${traitSet} cannot be used as a trait set.\`);
	}
}
	`);

	// getSymbol( targetSymName, ...traits )
	// looks for `targetSymName` inside `traits`, and returns the symbol, if found
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

	// implSymbol( target, sym, value ): `target.*[sym] = value`
	const implSymbolBuilder = template(`
function IMPL_SYMBOL( target, sym, value ) {
	Object.defineProperty( target, sym, {value, configurable:true} );
	return target[sym];
}
	`);

	// generating identifiers for the above functions
	const identifiers = {
		testTraitSet: path.scope.generateUidIdentifier(`testTraitSet`),
		getSymbol: path.scope.generateUidIdentifier(`getSymbol`),
		implSymbol: path.scope.generateUidIdentifier(`implSymbol`),
	};

	// adding to the AST the code for the above functions
	path.unshiftContainer('body', testTraitBuilder({ TEST_TRAIT_SET:identifiers.testTraitSet }) );
	path.unshiftContainer('body', getSymbolBuilder({ GET_SYMBOL:identifiers.getSymbol }) );
	path.unshiftContainer('body', implSymbolBuilder({ IMPL_SYMBOL:identifiers.implSymbol }) );

	// returning the identifiers
	return identifiers;
}


class UseTraitStatement {
	constructor( path, expr ) {
		this.path = path; // the AST node representing this statement
		this.expr = expr; // the trait set expression

		this.scope = null;
	}
}
class StraitsExpression {
	constructor( path, targetPath, symbolName ) {
		this.path = path;
		this.targetPath = targetPath;
		this.symbolName = symbolName;

		this.assignmentPath = null;
		this.scope = null;
	}

	get target() {
		return this.targetPath.node;
	}
	get assignmentValue() {
		return this.assignmentPath.node.right;
	}
}
class StraitsScope {
	constructor( path, traitSets ) {
		this.path = path;	// path where the scope begins
		this.traitSets = new Set(traitSets);	// the traitSets affecting this scope
		this.symbols = new Map();	// the symbols resolved in this scope
	}
}

class Straits {
	constructor() {
		this.useTraitStatements = [];
		this.straitsExpressions = [];
		this.straitsAssignments = [];

		this.scopeStack = [];
		this.currentScope = new StraitsScope();
	}

	empty() {
		return this.useTraitStatements.length === 0 &&
			this.straitsExpressions.length === 0 &&
			this.straitsAssignments.length === 0 &&
			this.scopeStack.length === 0;
	}
}

module.exports = function( args ) {
	const t = args.types;

	return {
		pre() {
			assert( ! this.straits );

			this.straits = new Straits();
		},
		post() {
			// all the straits-related data should have been handled and consumed by `Program.exit`
			assert( this.straits );
			assert( this.straits.empty() );

			// deleting `this.straits`: nothing should try to access it after `post`
			delete this.straits;
		},
		visitor: {
			Program: {
				enter( path ) {
					//console.error(`-----START PROGRAM-----`);
					//console.group();
				},
				exit( path ) {
					// NOTE: the visitor will keep running after `visitor.Program.exit()` is called:
					// it'll run on newly generated code (i.e. the code we're inserting here).
					// we do not expect that code to modify `this.straits`;
					// otherwise we'd have to handle the newly generated code as well...

					// To make sure, we're re-initializing `this.straits` and then checking in the `post`
					// function that `this.straits` has indeed not been used.

					//console.groupEnd();
					//console.error(`----- END  PROGRAM-----`);

					const {straits} = this;
					this.straits = new Straits();

					assert( straits.scopeStack.length === 0 );

					// if we didn't find any `use traits * from` statements, we can terminate immediately
					if( straits.useTraitStatements.length === 0 ) {
						assert( straits.straitsExpressions.length === 0 );
						return;
					}

					// generating global functions
					const traitFns = generateStraitsFunctions( args, path );

					// writing a `testTraitSet` call where each `use trait` statement is
					straits.useTraitStatements.forEach( (uts)=>{
						uts.path.insertBefore(
							t.expressionStatement(
								t.callExpression(
									traitFns.testTraitSet,
									[
										uts.expr
									]
								)
							)
						);
					});

					// for each `.*` usage, let's resolve the symbol and replace the expression
					{
						const resolveSymbol = (se)=>{
							const {scope, symbolName} = se;
							const {symbols} = scope;

							if( symbols.has(symbolName) ) {
								return symbols.get( symbolName );
							}

							// if the symbol was not used before, let's resolve it...
							const symbolIdentifier = path.scope.generateUidIdentifier( symbolName );
							symbols.set( symbolName, symbolIdentifier );

							// adding the `getSymbol( symName, ...traitSets )` line
							scope.path.insertBefore(
								t.variableDeclaration(
									`const`,
									[
										t.variableDeclarator(
											symbolIdentifier,
											t.callExpression(
												traitFns.getSymbol,
												[
													t.stringLiteral(symbolName),
													...Array.from( scope.traitSets ).map( uts=>uts.expr )
												]
											)
										)
									]
								)
							);

							return symbolIdentifier;
						};

						straits.straitsExpressions.forEach( (se)=>{
							const symbolIdentifier = resolveSymbol( se );

							se.path.replaceWith(
								t.memberExpression(
									se.target,
									symbolIdentifier,
									true
								)
							);
						});

						straits.straitsAssignments.reverse().forEach( (se)=>{
							const symbolIdentifier = resolveSymbol( se );

							se.assignmentPath.replaceWith(
								t.callExpression(
									traitFns.implSymbol,
									[
										se.target,
										symbolIdentifier,
										se.assignmentValue,
									]
								)
							);
						});
					}

					// removing everything that is unneeded...
					{
						straits.useTraitStatements.forEach( (uts)=>{
							uts.path.remove();
						});
					}
				}
			},

			BlockStatement: {
				enter( path ) {
					const {straits} = this;
					straits.scopeStack.push( straits.currentScope );

					//console.error(`{`);
					//console.group();
				},
				exit( path ) {
					const {straits} = this;
					straits.currentScope = straits.scopeStack.pop();

					//console.groupEnd();
					//console.error(`}`);
				}
			},

			// `use straits * from EXPR`
			LabeledStatement( path ) {
				const {straits} = this;

				const node = path.node;
				if( node.label.name !== '_StraitsProvider' ) {
					return;
				}

				assert( path.parent.type === 'BlockStatement' || path.parent.type === 'Program', `"use traits * from" must be placed in a block, or in the outermost scope.` );
				assert( path.node.body.type === 'ExpressionStatement', `\`use traits\` requires an expression.` );

				//console.error( `use traits * from ${generate(path.node.body.expression).code};` );

				const useTraitStatement = new UseTraitStatement(
					path,
					path.node.body.expression
				);

				straits.currentScope = new StraitsScope( path, straits.currentScope.traitSets );
				straits.currentScope.traitSets.add( useTraitStatement );
				useTraitStatement.scope = straits.currentScope;

				straits.useTraitStatements.push( useTraitStatement );
			},

			// a.*b
			Identifier( path ) {
				const {straits} = this;

				const node = path.node;
				if( node.name !== '_Straits' ) {
					return;
				}

				if( straits.currentScope.traitSets.size === 0 ) {
					throw path.buildCodeFrameError(`.* used outside a \`use traits\` scope.`);
				}

				// `a.*b` is represented in the AST as `a._Straits.b`
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

				//console.error( `.*${generate(traitPath.node.property).code}` );

				const straitsExpression = new StraitsExpression(
					traitPath,
					straitsOperatorPath.get('object'),
					traitPath.node.property.name
				);
				straitsExpression.scope = straits.currentScope;

				// if `a.*b = c`
				if( parentPath.type === 'AssignmentExpression' && parentPath.node.operator === '=' && parentPath.node.left === traitPath.node ) {
					straitsExpression.assignmentPath = parentPath;
					straits.straitsAssignments.push( straitsExpression );
				}
				else {
					straits.straitsExpressions.push( straitsExpression );
				}
			},

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
		},
	};
};

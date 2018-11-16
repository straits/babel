
# Straits Babel

> A babel parser and plugin implementing the [straits](https://github.com/peoro/straits/) syntax.

 - [Installation](#installation)
 - [Usage](#usage)
 - [Straits syntax](#straits-syntax)
 - [Examples](#examples)

## Installation

```
npm install --save-dev straits-babel
```

## Usage

Write the following to `.babelrc`, add it to `package.json` or pass it to `babel.transform()`:

```json
{
	"parserOpts": {
		"parser": "straits-babel"
	},
	"plugins": [
		"straits-babel/plugin"
	]
}
```

Then use [`babel`](https://babeljs.io/docs/en/index.html), `babel-node` or equivalent to transpile the straits syntax into valid JavaScript.

## Straits syntax

The [straits](https://github.com/peoro/straits/) syntax transpiles the `use straits` statement and `.*` expression.
These ease the usage of traits, implemented as `symbol` properties (see the [Iteration protocols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols) for an example of `symbol` properties implemented as traits in the ECMAScript standard).

The straits syntax offers several advantages over its alternatives:

 - it makes the code easier to write, read and understand,
 - it makes sure that the traits you access are offered by exactly one trait set you're using,
 - it doesn't pollute nor conflict with the normal scope variables.

## Examples

Let's see a minimal example:
```javascript
use traits * from Symbol;
[].*iterator();
// is equivalent to...
[][Symbol.iterator]();
```

Let's look at a more complete one:
```javascript
const {TraitSet} = require('straits').utils;
const traitSet1 = new TraitSet('duplicatedTrait', 'trait1');
const traitSet2 = new TraitSet('duplicatedTrait', 'trait2');

// an object we're going to assign traits to
const object = {};

// static error:
//   .* used outside a `use traits` scope.
//object.*trait1 = {};

use traits * from traitSet1;
use traits * from traitSet2;


// the following variables won't be used.
// they're here to show that variables won't interfere with traits
const duplicatedTrait = {}, trait1 = {}, missingTrait = {};

// the following line would throw an exception:
//   No trait set is providing symbol missingTrait.
//object.*missingTrait = {};

// the following line would throw an exception:
//   Symbol duplicatedTrait offered by multiple trait sets.
//object.*duplicatedTrait = {};

// the following lines are working as expected
object.*trait1 = `a trait`;
object.*trait2 = function() {
	console.log( `Greetings from ${this.*trait1}` );
}
object.*trait2(); // prints `Greetings from a trait`
```

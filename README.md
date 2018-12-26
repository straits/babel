# @straits/babel-plugin ![npm (scoped)](https://img.shields.io/npm/v/@straits/babel-plugin.svg?style=popout) ![NpmLicense](https://img.shields.io/npm/l/@straits/babel-plugin.svg?style=popout) ![David](https://img.shields.io/david/straits/babel.svg?style=popout) ![Travis (.com)](https://img.shields.io/travis/com/straits/babel.svg?style=popout) ![Coveralls github](https://img.shields.io/coveralls/github/straits/babel.svg?style=popout)

> A babel7 parser and plugin implementing the [straits](https://straits.github.io/) syntax.

-   [Installation](#installation)
-   [Usage](#usage)
-   [Straits syntax](#straits-syntax)
-   [Examples](#examples)

Note: the babel6 version is available on the [babel6 branch](https://github.com/straits/babel-plugin/tree/babel6) or as [`straits-babel@babel6` on npm](https://www.npmjs.com/package/straits-babel/v/babel6).

## Installation

```bash
npm install --save-dev @straits/babel-plugin
```

## Usage

The easiest way to get started, is by initializing a new project using `npm init @straits`.

That will lead you through the creation of a new node project, with all the dev dependencies already in `package.json` and optionally setting up mocha and ESLint to use the straits syntax.
You're left to run `npm install` to actually install the dev dependencies, and `npm start` to run a simple Hello World.
`npm run prepare` (automatically executed both by `npm install` and `npm publish`) will transpile the straits syntax source code into regular JavaScript in the `dist/` directory.

If you want to manually configure babel to use the straits syntax, just use `@straits` as a babel plugin.
For instance, after installing `@babel/cli`:

```bash
npx babel --plugins='@straits' your_straits_file.js
```

## Straits syntax

The [straits syntax](https://straits.github.io/syntax/) transpiles the `use straits` statement and `.*` expression.
These ease the usage of traits, implemented as `symbol` properties (see the [Iteration protocols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols) for an example of `symbol` properties implemented as traits in the ECMAScript standard).

The straits syntax offers several advantages over its alternatives:

-   it makes the code easier to write, read and understand,
-   it makes sure that the traits you access are offered by exactly one trait set you're using,
-   it doesn't pollute nor conflict with the normal scope variables.

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

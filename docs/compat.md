Compatibility
=============

L20n.js is a research project intended to be used in Firefox.  It is written in 
modern ECMAScript 2015 taking advantage of many of its features:

  - new syntax: arrow functions, spreads, destructuring, default parameter 
    values, object literal shorthands, template strings, `for…of` loops,

  - new methods: `String.prototype.startsWith`, `.endsWith`, `.includes`, 
    `Array.prototype.includes`,

  - new built-ins: promises, maps, weak maps, sets and weak sets,

  - generators and iterators.

It also makes use of the following DOM features:

  - MutationObservers,
  - HTMLTemplateElements (`<template>`).

L20n.js works well in recent versions of Firefox and Google Chrome.  It is also 
known to work in Microsoft Edge 13 and Safari TP.


Polyfills For Legacy Browsers
-----------------------------

For compatibility with legacy browsers transpilation and a set of polyfills is 
required.  The oldest browser that we know can be supported is IE 11.

You can find transpiled versions of l20n.js on the [v4.x][] branch of the 
repository in the [dist/compat][] directory.   It's provided for convenience 
and is not officially supported.

The transpiled versions require the following polyfills in order to work:

  - [Babel Polyfill][] which supports ES's new built-ins and ships with the 
    `regenerator` runtime,

  - [Shadow DOM Polyfill][] from the [webcomponents.org][] project which 
    provides support for the `<template>` element.

Optionally you may also want to use `Intl.js`:

  - [Intl.js][] which provides the locale data for correct number and date 
    formatting.

[v4.x]: https://github.com/l20n/l20n.js/tree/v4.x
[dist/compat]: https://github.com/l20n/l20n.js/tree/v4.x/dist/compat
[Babel Polyfill]: https://babeljs.io/docs/usage/polyfill/
[Shadow DOM Polyfill]: http://webcomponents.org/polyfills/shadow-dom/
[webcomponents.org]: http://webcomponents.org/
[Intl.js]: https://github.com/andyearnshaw/Intl.js


Example
-------

Install the required polyfills and the latest v4.x milestone of l20n.js:

    $ npm install babel-polyfill
    $ npm install webcomponents.js
    $ npm install intl
    $ npm install git://github.com/l20n/l20n.js.git#v4.x

And include them in your HTML like so:

    <script defer src="./node_modules/babel-polyfill/browser.js"></script>
    <script defer src="./node_modules/webcomponents.js/ShadowDOM.js"></script>

    <!-- optional but recommended -->
    <script defer src="./node_modules/intl/dist/Intl.js"></script>
    <script defer src="./node_modules/intl/locale-data/jsonp/en.js"></script>
    <script defer src="./node_modules/intl/locale-data/jsonp/fr.js"></script>

    <script defer src="./node_modules/l20n/dist/compat/web/l20n.js"></script> 


Manual Transpilation
--------------------

If you want to use a transpiled version of the master branch you'll need to 
transpile it yourself.  First build l20n.js as usual:

    $ npm install
    $ make

Next, install Babel's ES2015 preset.  Do not use the `loose` option.

    $ npm install babel-cli babel-preset-es2015

Finally transpile the files in `dist/bundle` into `dist/compat`:

    $ ./node_modules/.bin/babel --presets es2015 --out-dir dist/compat/web dist/bundle/web


Better compatibility
--------------------

If you'd like to help us document how to enable support for more browsers, 
please get in touch on IRC ([irc.mozilla.org/l20n][]).  Refer to the [browser 
usage table][] to make informed decisions :)

[irc.mozilla.org/l20n]: irc://irc.mozilla.org/l20n
[browser usage table]: http://caniuse.com/usage-table
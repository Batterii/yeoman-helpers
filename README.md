# @batterii/yeoman-helpers
[Yeoman](https://yeoman.io/) is useful, but its API is a very unpolished. This
package contains a library of helpers to make writing generators a bit less
frustrating.

We may consider contributing some of these to the Yeoman project itself, but for
now it is easier and faster to put them here.


## `Generator` Replacement Class
For now this library contains only one item-- a base `Generator` class to use
as a drop-in replacement for the one exported by
[yeoman-generator](https://www.npmjs.com/package/yeoman-generator). You can
inherit from it like so:

```js
const { Generator } = require('@batterii/yeoman-helpers');

class MyGenerator extends Generator {
	// Implement your generator here as normal.
}

module.exports = MyGenerator;
```

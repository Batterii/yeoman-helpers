const { isArray, isString, mergeWith } = require('lodash');
const YeomanGenerator = require('yeoman-generator');
const path = require('path');

/**
 * A replacement [Generator](https://yeoman.github.io/generator/Generator.html)
 * class with extensions.
 * @class Generator
 * @param {string|Array} args - Generator arguments.
 * @param {Object} opts - Generator options.
 */
class Generator extends YeomanGenerator {
	/**
	 * The base name of the destination directory.
	 * @type string
	 */
	get destinationName() {
		return path.basename(this.destinationPath());
	}

	/**
	 * Copies a template file to the destination. Similar to `this.fs.CopyTpl`
	 * except it takes relative paths and has sane defaults.
	 * @param {string} templatePath - Path to the template file in the templates
	 *   directory.
	 * @param {string} [destinationPath = templatePath] - Path to the desination
	 *   file in the destination directory.
	 * @param {Object} [options = this.options] - Data properties for the
	 *   template.
	 */
	copyTemplate(
		templatePath,
		destinationPath = templatePath,
		options = this.options
	) {
		this.fs.copyTpl(
			this.templatePath(templatePath),
			this.destinationPath(destinationPath),
			options
		);
	}

	/**
	 * Adds properties to a json file. Similar to `this.fs.extendJSON` except
	 * that it accepts a relative path, indents with tabs, accepts a customizer
	 * function to change merging behavior as needed.
	 * @param {string} destinationPath - Path to the json file in the
	 *   destination directory.
	 * @param {object} contents - Object with properties to merge into the json
	 *   file.
	 * @param {function} [customizer] - A customizer function, as accepted by
	 *   lodash [mergeWith](https://lodash.com/docs/4.17.11#mergeWith). If
	 *   omitted, this method will use a customizer that concatenates arrays
	 *   occurring at the same property path, instead of simply overwriting the
	 *   old array values with the new.
	 */
	extendJson(destinationPath, contents, customizer = concatArrays) {
		const filePath = this.destinationPath(destinationPath);
		const obj = this.fs.readJSON(filePath, {});
		mergeWith(obj, contents, customizer);
		this.fs.writeJSON(filePath, obj, null, '\t');
	}

	/**
	 * Adds properties to tsconfig.json at the destination. Behaves exactly as
	 * `#extendJson` for that file.
	 * @param {object} contents - Object with properties to merge into the
	 *  tsconfig.json file.
	 * @param {function} [customizer] - Customizer function as described in
	 *   `#extendJson`
	 */
	extendTsConfig(contents, customizer = concatArrays) {
		this.extendJson('tsconfig.json', contents, customizer);
	}

	/**
	 * Adds properties to package.json at the destination. Behaves exactly as
	 * `#extendJson` for that file.
	 * @param {object} contents - Object with properties to merge into the
	 *  package.json file.
	 * @param {function} [customizer] - Customizer function as described in
	 *   `#extendJson`
	 */
	extendPackage(contents, customizer = concatArrays) {
		this.extendJson('package.json', contents, customizer);
	}

	/**
	 * Adds npm scripts to package.json at the destination. Any script with a
	 * name that already exists is appended to the existing script with a
	 * ` && ` separator, instead of replacing it completely.
	 * @param {object} scripts - Object with script strings to add, keyed by the
	 *   script name.
	 * @param {boolean} [prepend = false] - Set true to prepend to existing
	 *   scripts instead of appending. Will likewise use ` && ` as a separator.
	 */
	addScripts(scripts, prepend = false) {
		this.extendPackage(
			{ scripts },
			prepend ? appendScripts : prependScripts
		);
	}
}

/**
 * Default customizer function for Generator#extendJson and its variants.
 * @private
 * @param {any} obj - Existing property value.
 * @param {any} src - New property value.
 * @returns {Array|undefined} - Concatenated array, or undefined to defer
 *   to the default merging behavior.
 */
function concatArrays(obj, src) {
	if (isArray(obj) && isArray(src)) return obj.concat(src);
}

/**
 * Customizer function for Generator#addScripts.
 * @private
 * @param {any} obj - Existing property value.
 * @param {any} src - New property value.
 * @returns {string|undefined} - Script with new content appended, or undefined
 *   to defer to the default merging behavior.
 */
function appendScripts(obj, src) {
	if (isString(obj) && isString(src)) return `${obj} && ${src}`;
}

/**
 * Alternate customizer function for Generator#addScripts.
 * @private
 * @param {any} obj - Existing property value.
 * @param {any} src - New property value.
 * @returns {string|undefined} - Script with new content prepended, or undefined
 *   to defer to the default merging behavior.
 */
function prependScripts(obj, src) {
	if (isString(obj) && isString(src)) return `${src} && ${obj}`;
}

module.exports = Generator;

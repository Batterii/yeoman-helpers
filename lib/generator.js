const { assign, isArray, isString, mergeWith } = require('lodash');
const OptionPrompt = require('./option-prompt');
const YeomanGenerator = require('yeoman-generator');
const path = require('path');

/**
 * A replacement [Generator](https://yeoman.github.io/generator/Generator.html)
 * class with extensions, to be used as a base class for actual generators.
 * @class Generator
 * @constructor
 * @param {string|Array} args - Generator arguments.
 * @param {Object} opts - Generator options.
 * @example
 * const { Generator } = require('@batterii/yeoman-helpers');
 *
 * class MyGenerator extends Generator {
 * 	 // Implement your generator here as normal.
 * }
 *
 * module.exports = MyGenerator;
 */
class Generator extends YeomanGenerator {
	constructor(args, opts) {
		super(args, opts);

		/**
		 * Array for storing options registered with `#optionPrompt`.
		 * @private
		 * @type Array
		 */
		this._optionPrompts = [];

		/*
		 * Assign a `prompting` task reference onto any subclass prototypes.
		 * This allows it to run even if subclasses do not explicitly define it.
		 */
		const prototype = Object.getPrototypeOf(this);
		if (!Object.prototype.hasOwnProperty.call(prototype, 'prompting')) {
			prototype.prompting = this.prompting;
		}
	}

	/**
	 * The base name of the destination directory.
	 * @type string
	 */
	get destinationName() {
		return path.basename(this.destinationPath());
	}

	/**
	 * Register an option/prompt hybrid. Options registered this way can be set
	 * through Yeoman CLI options and `#composeWith` as normal. The generator
	 * will start its run by prompting the user for any hybrid options that were
	 * not provided, in the same order they were registered.
	 * @param {Object} config
	 *   @param {string} config.name - The option name. Equivalent to the `name`
	 *    argument of the `#option` method and the `question.name` argument of
	 *    the `#prompt` method.
	 *   @param {string} config.type - The prompt type to show, either 'input'
	 *    or 'confirm'. This will be mapped to a corresponding option type for
	 *    CLI usage.
	 *   @param {string} config.alias - Short option name for CLI usage.
	 *    Equivalent to `config.alias` on the `#option` method.
	 *   @param {string} config.description - Full description of the option for
	 *    the CLI `-h` and `--help` flags. Equivalent to `config.description` on
	 *    the `#option` method.
	 *   @param {string} config.message - Message to show the user when
	 *    prompting for the option. This should be similar to
	 *    `config.description`, except phrased as an instruction or question.
	 *    Equivalent to the `question.message` argument for the `#prompt`
	 *    method.
	 *   @param {function|string|boolean} config.default - A default value for
	 *     the prompt, or a function that returns or resolves with one.
	 *     Equivalent to the `question.default` argument for the `#prompt`
	 *     method, except that a function does not recieve any arguments.
	 *   @param {function} config.validate - A function that recieves the user's
	 *     input as an argument. Return `true` for valid input, a string message
	 *     for invalid input, or `false` for a default message. Equivalent to
	 *     the 	`question.validate` argument for the `#prompt` method, except
	 *     that it is also applied to a CLI argument, ensuring unity betwen the
	 *     two forms of input.
	 *   @param {function} config.allowed - A function that recieves the current
	 *     `options` object and returns either `true` or `false`. If provided,
	 *     and false is returned, the CLI option will be ignored and no prompt
	 *     will be shown for it. Instead, its value will be equal to
	 *    `config.whenProhibited`. Use these two options in conjunction when an
	 *     option should not be configurable based on other options.
	 *   @param {string|boolean} config.whenProhibited - The value to use for
	 *     the option when `config.allowed` is provided and returns `false`.
	 */
	optionPrompt(config) {
		// Create the new option prompt.
		const optionPrompt = new OptionPrompt(this, config);

		// Add the corresponding yeoman option.
		this.option(config.name, optionPrompt.optionConfig);

		// Push it onto the array.
		this._optionPrompts.push(optionPrompt);
	}

	/**
	 * Prompts for any missing options defined by `#optionPrompt`. This is
	 * re-assigned onto the prototype of any subclass, and will run before other
	 * tasks since Yeoman [prioritizes it based on its name][1]. If you need
	 * other prompts to be shown with this priority, override this method and
	 * place `await super.prompting()` either before or after your additional
	 * prompts.
	 * [1]: https://yeoman.io/authoring/running-context.html#the-run-loop
	 */
	async prompting() {
		for (const optionPrompt of this._optionPrompts) {
			// eslint-disable-next-line no-await-in-loop
			await optionPrompt.resolve();
		}
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
		options = this.options,
	) {
		this.fs.copyTpl(
			this.templatePath(templatePath),
			this.destinationPath(destinationPath),
			options,
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
			prepend ? prependScripts : appendScripts,
		);
	}

	/**
	 * Sorts the scripts in package.json according to the provided array of
	 * names. Any name that is not present will be skipped. Any name that is
	 * present but not specified in the array will retain its prevous sort
	 * position, except at the end of any that are specifed in the array. This
	 * is nice for restoring sanity to your list of scripts in package.json
	 * after several composed generators have modified it.
	 * @param {Array<string>} names
	 */
	sortScripts(names) {
		const pkgPath = this.destinationPath('package.json');
		const pkg = this.fs.readJSON(pkgPath, {});
		const { scripts } = pkg;
		const sorted = {};
		for (const name of names) {
			if (name in scripts) {
				sorted[name] = scripts[name];
				delete scripts[name];
			}
		}
		pkg.scripts = assign(sorted, scripts);
		this.fs.writeJSON(pkgPath, pkg, null, '\t');
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

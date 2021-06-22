const {assign, isFunction, isString, pick} = require("lodash");
const typeMap = require("./prompt-type-map");

/**
 * Represents a single registered option prompt hybrid.
 * @class OptionPrompt
 * @private
 * @constructor
 * @param {Generator} generator - Parent Generator instance.
 * @param {Object} config - Configuration object, as documented in
 *   `Generator#optionPrompt`.
 */
class OptionPrompt {
	constructor(generator, config) {
		this.generator = generator;
		this.config = config;
	}

	/**
	 * Indicates whether the option is allowed based on `config.allowed`.
	 * @type boolean
	 */
	get isAllowed() {
		const {allowed} = this.config;
		return !isFunction(allowed) || allowed(this.generator.options);
	}

	/**
	 * Indicates whether or not the option is missing from `generator.options`.
	 * @type boolean
	 */
	get isMissing() {
		return this.generator.options[this.config.name] === undefined;
	}

	/**
	 * The `Boolean` or `String` constructor, depending on `config.type`, to be
	 * used as the `config.type` argument to `generator.option`. Accessing it
	 * will throw, if an unsupported `config.type` is set.
	 * @type Function
	 */
	get optionType() {
		const {type} = this.config;
		const optionType = typeMap[type];
		if (!optionType) throw new Error(`Unsupported prompt type '${type}'`);
		return optionType;
	}

	/**
	 * The configuration object to provide to `generator.option` when
	 * registering.
	 * @type Object
	 */
	get optionConfig() {
		return assign({
			type: this.optionType,
		}, pick(this.config, ["description", "alias"]));
	}

	/**
	 * The question object to provide to `generator.prompt` to prompt the user.
	 * @type Object
	 */
	get question() {
		const {options} = this.generator;
		const {name, default: def} = this.config;
		return assign({
			default: () => (isFunction(def) ? def() : def),
			when: () => options[name] === undefined,
		}, pick(this.config, ["message", "name", "type", "validate"]));
	}

	/**
	 * Prompt the user for the option, if is allowed and has has not already
	 * been provided through the CLI. The user's answer-- or the
	 * `config.whenProhibted` value-- will be assigned onto `generator.options`.
	 */
	async prompt() {
		const {options} = this.generator;
		if (this.isAllowed) {
			assign(options, await this.generator.prompt([this.question]));
		} else {
			const {name, whenProhibited} = this.config;
			options[name] = whenProhibited;
		}
	}

	/**
	 * Validate the option against its `config.validate` function, if any.
	 * This method will report any validation error to `generator.env`, forcing
	 * the run to end with an appropriate message to the user.
	 */
	async validate() {
		const {name, validate} = this.config;
		if (isFunction(validate)) {
			const {options, env} = this.generator;
			const input = options[name];
			let result = await validate(input);
			if (!result) result = `Invalid ${name} option '${input}'`;
			if (isString(result)) env.error(result);
		}
	}

	/**
	 * Convenience method to prompt for the option, then validate it.
	 */
	async resolve() {
		await this.prompt();
		await this.validate();
	}
}

module.exports = OptionPrompt;

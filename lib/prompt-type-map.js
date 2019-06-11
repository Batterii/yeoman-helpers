/*
Mapping from prompt types to CLI option types.
Keys are prompt types, while values are CLI option types.
Any prompt type must be listed here in order to be supported.
*/
module.exports = {
	confirm: Boolean,
	input: String,
};

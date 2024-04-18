const util = require('util');
const config = require('config');
const OpenAI = require('openai');
let openai;

/**
 * @param {Object} data
 */
exports.log = (data) => {
	console.log(util.inspect(data, { colors: true, showHidden: false, depth: null }));
}

/**
 * @param {number} ms
 * @returns {Promise<*>}
 */
exports.delay = (ms) => {
	return new Promise(resolve => setTimeout(resolve, ms));
};

exports.getOpenAI = () => {
	if (openai) {
		return openai;
	}

	openai = new OpenAI({
		apiKey: config.OPENAI_API_KEY,
	});
	return openai;
};

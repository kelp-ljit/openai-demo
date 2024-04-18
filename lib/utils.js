const config = require('config');
const OpenAI = require('openai');
let openai;

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

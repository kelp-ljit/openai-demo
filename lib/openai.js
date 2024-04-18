const utils = require('./utils');

exports.createAssistant = async ({ instructions, fileIds, name = '智能客服', model = 'gpt-4-turbo-preview' }) => {
	const openai = utils.getOpenAI();

	return openai.beta.assistants.create({
		model,
		name,
		instructions,
		tools: [
			{ type: 'code_interpreter' },
			{ type: 'retrieval' },
			...Object.entries(require('./tools')).map(([_, tool]) => tool.assistantOptions),
		],
		file_ids: fileIds,
	});
};

async function submitToolOutputs(run) {
	const openai = utils.getOpenAI();
	const toolOutputs = await Promise.all(run.required_action.submit_tool_outputs.tool_calls.map(async toolCall => {
		const tool = require('./tools')[toolCall.function.name];

		return {
			tool_call_id: toolCall.id,
			output: await tool.execute({ run, toolCall }),
		};
	}));

	return openai.beta.threads.runs.submitToolOutputs(
		run.thread_id,
		run.id,
		{
			tool_outputs: toolOutputs,
		},
	);
}

exports.retrieveRunUntilFinish = async (threadId, runId) => {
	let run;
	const openai = utils.getOpenAI();
	const finishStatuses = ['cancelled', 'failed', 'completed', 'expired'];

	do {
		await utils.delay(1000);
		run = await openai.beta.threads.runs.retrieve(threadId, runId);

		if (run.status === 'requires_action') {
			await submitToolOutputs(run);
		}
	} while (!finishStatuses.includes(run.status));

	return run;
};

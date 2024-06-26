const utils = require('./utils');

exports.createAssistant = async (
	{
		instructions,
		fileIds = [],
		name = '智能客服',
		model = 'gpt-4-turbo-preview',
	},
) => {
	const openai = utils.getOpenAI();

	return openai.beta.assistants.create({
		model,
		name,
		instructions,
		tools: [
			...(fileIds.length > 0
				? [
					{ type: 'code_interpreter' },
					{ type: 'file_search' },
				]
				: []),
			// { type: 'retrieval' }, // npm openai v4.36.0
			...Object.entries(require('./tools')).map(([_, tool]) => tool.assistantOptions),
		],
		// file_ids: fileIds, // npm openai v4.36.0
		...(fileIds.length > 0
			? {
				tool_resources: {
					// code_interpreter: {
					// 	file_ids: fileIds,
					// },
					file_search: {
						vector_stores: [{file_ids: fileIds}]
					},
				},
			}
			: {}
		),
	});
};

async function submitToolOutputs(run) {
	const openai = utils.getOpenAI();
	const toolOutputs = await Promise.all(run.required_action.submit_tool_outputs.tool_calls.map(async toolCall => {
		const tool = require('./tools')[toolCall.function.name];

		try {
			return {
				tool_call_id: toolCall.id,
				output: await tool.execute({ run, toolCall }),
			};
		} catch (error) {
			console.error({toolCall});
			throw error;
		}
	}));

	return openai.beta.threads.runs.submitToolOutputs(
		run.thread_id,
		run.id,
		{
			tool_outputs: toolOutputs,
		},
	);
}

exports.retrieveRunUntilFinish = async ({threadId, runId, executeTool}) => {
	let run;
	const openai = utils.getOpenAI();
	const finishStatuses = ['cancelled', 'failed', 'completed', 'expired'];

	do {
		await utils.delay(1000);
		run = await openai.beta.threads.runs.retrieve(threadId, runId);

		if (run.status === 'requires_action') {
			executeTool({
				toolCalls: run.required_action.submit_tool_outputs.tool_calls,
			});
			await submitToolOutputs(run);
		}
	} while (!finishStatuses.includes(run.status));

	return run;
};

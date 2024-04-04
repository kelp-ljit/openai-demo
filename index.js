const fs = require('fs');
const util = require('util');
const config = require('config');
const { program } = require('commander');
const OpenAI = require('openai');
const readline = require('readline');
const openai = new OpenAI({
	apiKey: config.OPENAI_API_KEY,
});

program
	.name('')
	.usage(`
	-------- Assistant -------------
	node . as ls
	node . as del <id>
	
	-------- Model -------------
	node . model ls
	
	-------- File -------------
	node . file ls
	node . file create <path>
	node . file del <id>
	
	-------- Run -----------
	node . start {gpt-4-1106-preview}
	`);
program
	.command('as')
	.description('Assistant commands');
program
	.command('model')
	.description('Model commands');
program
	.command('file')
	.description('File commands');
program
	.command('start')
	.description('Start chat');
program.parse(process.argv);

function log(data) {
	console.log(util.inspect(data, { colors: true, showHidden: false, depth: null }));
}

async function createAssistant({ userProfile = config.USER_PROFILE, model = 'gpt-4-turbo-preview' }) {
	return openai.beta.assistants.create({
		model,
		name: '智能客服',
		instructions: `
			你是一位客服。
			
			底下是使用者的資訊：
			${Object.entries(userProfile).map(([key, value]) => `${key}: ${value}`).join('\n')}
		`,
		tools: [
			{ type: 'code_interpreter' },
			{
				type: 'function',
				function: {
					name: 'reset_password',
					description: 'Call api to reset the password of the user.',
					parameters: {
						type: 'object',
						properties: {
							clientId: {
								type: 'string',
								description: '会员帐号',
							},
						},
						required: ['clientId'],
					},
				},
			},
			{
				type: 'function',
				function: {
					name: 'change_to_human_customer_service',
					description: '當你無法處理使用者的問題時需要切換至人工客服。',
					parameters: {
						type: 'object',
						properties: {},
						required: [],
					},
				},
			},
		],
		file_ids: [],
	});
}

/**
 * @param {{id: string, function: {name: string, arguments: string}}} toolCall
 * @returns {string}
 */
function processToolCall(toolCall) {
	const args = JSON.parse(toolCall.function.arguments);

	log({toolCall});
	switch (toolCall.function.name) {
		case 'reset_password':
			return `請點擊 https://google.com?clientId=${args.clientId} 重新設定密碼`;
		case 'change_to_human_customer_service':
			return `切換至人工客服`;
		default:
			return '沒有這個功能';
	}
}

async function submitToolOutputs(run) {
	return openai.beta.threads.runs.submitToolOutputs(
		run.thread_id,
		run.id,
		{
			tool_outputs: run.required_action.submit_tool_outputs.tool_calls.map(toolCall => {
				return {
					tool_call_id: toolCall.id,
					output: processToolCall(toolCall),
				};
			}),
		},
	);
}

async function retrieveRunUntilFinish(threadId, runId) {
	let run;
	const finishStatuses = ['cancelled', 'failed', 'completed', 'expired'];

	do {
		run = await openai.beta.threads.runs.retrieve(threadId, runId);

		if (run.status === 'requires_action') {
			await submitToolOutputs(run);
		}
	} while (!finishStatuses.includes(run.status));

	return run;
}

/**
 * List assistants.
 * @returns {Promise<void>}
 */
async function listAssistants() {
	const response = await openai.beta.assistants.list({
		limit: 100,
		order: 'desc',
	});

	log(response.data);
}

/**
 * Delete assistant.
 * @param {string} id
 * @returns {Promise<void>}
 */
async function deleteAssistant(id) {
	const result = await openai.beta.assistants.del(id);

	log(result);
}

/**
 * List models.
 * @returns {Promise<void>}
 */
async function listModels() {
	const response = await openai.models.list();

	log(response.data);
}

/**
 * List files.
 * @returns {Promise<void>}
 */
async function listFiles() {
	const response = await openai.files.list({
		limit: 100,
		order: 'desc',
	});

	log(response.data);
}

/**
 * Delete file.
 * @param {string} id
 * @returns {Promise<void>}
 */
async function deleteFile(id) {
	const result = await openai.files.del(id);

	log(result);
}

/**
 * Create file.
 * @param {string} path
 * @returns {Promise<void>}
 */
async function createFile(path) {
	const file = await openai.files.create({
		file: fs.createReadStream(path),
		purpose: 'assistants',
	});

	log(file);
}

/**
 * Start chat.
 * @param {string} model - gpt-3.5-turbo | gpt-4 | gpt-4-1106-preview
 * @returns {Promise<void>}
 */
async function start({ model = 'gpt-4-1106-preview' } = {}) {
	const userInterface = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	const assistant = await createAssistant({
		model,
	});
	const fileIdPattern = /(file-\w{24})/g;
	let thread;
	let run;

	userInterface.on('line', async input => {
		const start = new Date();
		const fileIds = input.match(fileIdPattern);

		if (!thread) {
			thread = await openai.beta.threads.create();
		}

		await openai.beta.threads.messages.create(
			thread.id,
			{
				role: 'user',
				content: input,
				file_ids: fileIds || [],
			},
		);
		run = await openai.beta.threads.runs.create(
			thread.id,
			{ assistant_id: assistant.id },
		);
		run = await retrieveRunUntilFinish(thread.id, run.id);

		const response = await openai.beta.threads.messages.list(
			run.thread_id,
			{ order: 'asc' },
		);

		log(response.data);
		console.log(`duration: ${`${(Date.now() - start)}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}ms`);
	});
	userInterface.prompt();
	return new Promise(() => {});
}

async function execute() {
	const { args } = program;

	if (args[0] === 'as') {
		if (args[1] === 'ls') {
			return listAssistants();
		}

		if (['del', 'delete'].includes(args[1])) {
			return deleteAssistant(args[2]);
		}
	}

	if (args[0] === 'model') {
		if (args[1] === 'ls') {
			return listModels();
		}
	}

	if (args[0] === 'file') {
		if (args[1] === 'ls') {
			return listFiles();
		}

		if (args[1] === 'create') {
			return createFile(args[2]);
		}

		if (['del', 'delete'].includes(args[1])) {
			return deleteFile(args[2]);
		}
	}

	if (args[0] === 'start') {
		return start(args[1]);
	}
}

execute()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});

exports.switchToHumanCustomerService = {
	assistantOptions: {
		type: 'function',
		function: {
			name: 'switchToHumanCustomerService',
			description: '转接人工客服，当任一参数未提供时必须请客户提供。',
			parameters: {
				type: 'object',
				properties: {
					issue: {
						type: 'string',
						description: '使用者遇到的问题。如果无法明确的找到数值请询问使用者。',
					},
					date: {
						type: 'string',
						description: '交易或问题发生时间。如果无法明确的找到数值请询问使用者。',
					},
					details: {
						type: 'string',
						description: '订单号、提款方式或游戏名称。如果无法明确的找到数值请询问使用者。',
					},
				},
				required: ['issue', 'date', 'details'],
			},
		},
	},
	/**
	 * @param {{id: string, thread_id: string}} run
	 * @param {{id: string, function: {name: string, arguments: string}}} toolCall
	 * @returns {Promise<string>}
	 */
	async execute({ run, toolCall }) {
		if (!toolCall.function?.arguments) {
			return '为了确保人工客服能高效解决您的问题，请先告诉我们您遇到的具体问题或您希望咨询的详细情况。';
		}

		const args = JSON.parse(toolCall.function.arguments);

		if (
			!args.issue || args.issue === '未提供' ||
			!args.date || args.date === '未提供' ||
			!args.details || args.details === '未提供'
		) {
			return '为了确保人工客服能高效解决您的问题，请先告诉我们您遇到的具体问题或您希望咨询的详细情况。';
		}

		return '将转接至人工客服';
	},
};

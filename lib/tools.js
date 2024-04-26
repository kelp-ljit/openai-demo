exports.switchToHumanCustomerService = {
	assistantOptions: {
		type: 'function',
		function: {
			name: 'switchToHumanCustomerService',
			description: '转接人工客服，当你无法处理使用者的问题时切換至人工客服。',
			parameters: {
				type: 'object',
				properties: {
					issue: {
						type: 'string',
						description: '使用者在平台遇到的问题，因此「轉接人工」並不是此參數的值。',
					},
					account: {
						type: 'string',
						description: '使用者在平台的帐号。',
					},
					details: {
						type: 'string',
						description: '使用者的订单号、提款方式、交易金額、彩种期号、银行名、手机型号或游戏名称。',
					},
				},
				required: ['issue'],
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
			return '尚未转接人工客服，請使用者提供帳號、订单号或問題的具體內容來補齊剩餘參數，補齊後才能轉接人工客服。';
		}

		const args = JSON.parse(toolCall.function.arguments);
		const hasIssue = args.issue && args.issue !== '未提供';
		const hasAccount = args.account && args.account !== '未提供';
		const hasDetails = args.details && args.details !== '未提供';

		if (!hasIssue || !(hasAccount || hasDetails)) {
			return '尚未转接人工客服，請使用者提供帳號、订单号或問題的具體內容來補齊剩餘參數，補齊後才能轉接人工客服。';
		}

		return '沒問題，将转接至人工客服。';
	},
};

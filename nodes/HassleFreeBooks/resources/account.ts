import type { INodeProperties } from 'n8n-workflow';
import { unwrap } from './shared';

const show = { resource: ['account'] };

export const accountDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get the chart of accounts',
				routing: {
					request: { method: 'GET', url: '/accounts' },
					output: unwrap('data.accounts'),
				},
			},
		],
		default: 'getAll',
	},
];

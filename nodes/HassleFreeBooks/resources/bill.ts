import type { INodeProperties } from 'n8n-workflow';
import { unwrap } from './shared';

const show = { resource: ['bill'] };
const create = { show: { ...show, operation: ['create'] } };

export const billDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a bill',
				description: 'Record a bill from a vendor that you will pay later',
				routing: {
					request: { method: 'POST', url: '/bills' },
					output: unwrap('data.bill'),
				},
			},
		],
		default: 'create',
	},
	{
		displayName: 'Vendor Name',
		name: 'vendorName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: create,
		routing: { send: { type: 'body', property: 'vendor_name' } },
	},
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'string',
		default: '',
		required: true,
		placeholder: '89.99',
		description: 'In dollars, e.g. 89.99',
		displayOptions: create,
		routing: { send: { type: 'body', property: 'amount' } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: create,
		options: [
			{
				displayName: 'Bill Date',
				name: 'billDate',
				type: 'string',
				placeholder: 'YYYY-MM-DD',
				default: '',
				description: 'Defaults to today',
				routing: { send: { type: 'body', property: 'bill_date' } },
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'description' } },
			},
			{
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'string',
				placeholder: 'YYYY-MM-DD',
				default: '',
				routing: { send: { type: 'body', property: 'due_date' } },
			},
		],
	},
];

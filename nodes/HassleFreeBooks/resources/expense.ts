import type { INodeProperties } from 'n8n-workflow';
import { unwrap } from './shared';

const show = { resource: ['expense'] };
const create = { show: { ...show, operation: ['create'] } };

export const expenseDescription: INodeProperties[] = [
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
				action: 'Record an expense',
				description: 'Record money already spent, posted straight to the books',
				routing: {
					request: { method: 'POST', url: '/expenses' },
					output: unwrap('data.expense'),
				},
			},
		],
		default: 'create',
	},
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'string',
		default: '',
		required: true,
		placeholder: '42.50',
		description: 'In dollars, e.g. 42.50',
		displayOptions: create,
		routing: { send: { type: 'body', property: 'amount' } },
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		required: true,
		displayOptions: create,
		routing: { send: { type: 'body', property: 'description' } },
	},
	{
		displayName: 'Expense Account Name or ID',
		name: 'categoryId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getExpenseAccounts' },
		default: '',
		required: true,
		description:
			'What the money was spent on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: create,
		routing: { send: { type: 'body', property: 'category_id', value: '={{Number($value)}}' } },
	},
	{
		displayName: 'Paid From Account Name or ID',
		name: 'paymentAccountId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getPaymentAccounts' },
		default: '',
		required: true,
		description:
			'The bank account or credit card it was paid from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: create,
		routing: { send: { type: 'body', property: 'payment_account_id', value: '={{Number($value)}}' } },
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
				displayName: 'Date',
				name: 'expenseDate',
				type: 'string',
				placeholder: 'YYYY-MM-DD',
				default: '',
				description: 'Defaults to today',
				routing: { send: { type: 'body', property: 'expense_date' } },
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'notes' } },
			},
			{
				displayName: 'Reference',
				name: 'reference',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'reference' } },
			},
			{
				displayName: 'Vendor Name',
				name: 'vendorName',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'vendor_name' } },
			},
		],
	},
];

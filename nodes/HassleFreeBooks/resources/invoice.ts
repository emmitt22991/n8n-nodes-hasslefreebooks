import type { INodeProperties } from 'n8n-workflow';
import { idField, unwrap } from './shared';

const show = { resource: ['invoice'] };
const op = (...operation: string[]) => ({ show: { ...show, operation } });

export const invoiceDescription: INodeProperties[] = [
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
				action: 'Create an invoice',
				description: 'Create a draft invoice from line items',
				routing: {
					request: { method: 'POST', url: '/invoices' },
					output: unwrap('data.invoice'),
				},
			},
			{
				name: 'Finalize',
				value: 'finalize',
				action: 'Finalize an invoice',
				description: 'Post a draft or sent invoice to Accounts Receivable',
				routing: {
					request: { method: 'POST', url: '=/invoices/{{$parameter.invoiceId}}/finalize' },
					output: unwrap('data'),
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an invoice',
				routing: {
					request: { method: 'GET', url: '=/invoices/{{$parameter.invoiceId}}' },
					output: unwrap('data.invoice'),
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many invoices',
				description: 'Newest first',
				routing: {
					request: { method: 'GET', url: '/invoices' },
					output: unwrap('data.invoices'),
				},
			},
			{
				name: 'Record Payment',
				value: 'recordPayment',
				action: 'Record a payment on an invoice',
				routing: {
					request: { method: 'POST', url: '/invoices/record-payment' },
					output: unwrap('data'),
				},
			},
			{
				name: 'Send',
				value: 'send',
				action: 'Email an invoice',
				description: "Email a draft invoice as a PDF to the customer's email address",
				routing: {
					request: { method: 'POST', url: '=/invoices/{{$parameter.invoiceId}}/send' },
					output: unwrap('data'),
				},
			},
		],
		default: 'create',
	},

	// ---------------------------------------------------------------- create
	{
		displayName: 'Customer ID',
		name: 'contactId',
		type: 'string',
		default: '',
		required: true,
		description: 'ID of a customer contact (Contact > Create or Get Many returns it)',
		displayOptions: op('create'),
		routing: { send: { type: 'body', property: 'contact_id', value: '={{Number($value)}}' } },
	},
	{
		displayName: 'Invoice Date',
		name: 'invoiceDate',
		type: 'string',
		default: '={{$today.toFormat("yyyy-MM-dd")}}',
		required: true,
		placeholder: 'YYYY-MM-DD',
		displayOptions: op('create'),
		routing: { send: { type: 'body', property: 'invoice_date' } },
	},
	{
		displayName: 'Line Items',
		name: 'lineItems',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: { line: [{ description: '', quantity: '1', unitPrice: '' }] },
		required: true,
		displayOptions: op('create'),
		options: [
			{
				displayName: 'Line',
				name: 'line',
				values: [
					{ displayName: 'Description', name: 'description', type: 'string', default: '' },
					{ displayName: 'Quantity', name: 'quantity', type: 'string', default: '1' },
					{
						displayName: 'Unit Price',
						name: 'unitPrice',
						type: 'string',
						default: '',
						placeholder: '125.00',
						description: 'In dollars, e.g. 125.00',
					},
				],
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'line_items',
				value:
					'={{ ($value.line || []).map(l => ({ description: l.description, quantity: String(l.quantity), unit_price: String(l.unitPrice) })) }}',
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: op('create'),
		options: [
			{
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'string',
				placeholder: 'YYYY-MM-DD',
				default: '',
				routing: { send: { type: 'body', property: 'due_date' } },
			},
			{
				displayName: 'Invoice Number',
				name: 'invoiceNumber',
				type: 'string',
				default: '',
				description: 'Leave empty to let HassleFreeBooks number it',
				routing: { send: { type: 'body', property: 'invoice_number' } },
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				routing: { send: { type: 'body', property: 'notes' } },
			},
		],
	},

	// ---------------------------------------------------- get / finalize / send
	idField('Invoice ID', 'invoiceId', { ...show, operation: ['get', 'finalize', 'send'] }),

	// ---------------------------------------------------------------- getAll
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 100 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: op('getAll'),
		routing: { send: { type: 'query', property: 'per_page' } },
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: op('getAll'),
		options: [
			{
				displayName: 'Customer ID',
				name: 'contactId',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'contact_id' } },
			},
			{
				displayName: 'From Date',
				name: 'startDate',
				type: 'string',
				placeholder: 'YYYY-MM-DD',
				default: '',
				routing: { send: { type: 'query', property: 'start_date' } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Draft', value: 'draft' },
					{ name: 'Finalized', value: 'finalized' },
					{ name: 'Paid', value: 'paid' },
					{ name: 'Sent', value: 'sent' },
					{ name: 'Void', value: 'void' },
				],
				default: 'draft',
				routing: { send: { type: 'query', property: 'status' } },
			},
			{
				displayName: 'To Date',
				name: 'endDate',
				type: 'string',
				placeholder: 'YYYY-MM-DD',
				default: '',
				routing: { send: { type: 'query', property: 'end_date' } },
			},
		],
	},

	// --------------------------------------------------------- recordPayment
	{
		displayName: 'Invoice ID',
		name: 'paymentInvoiceId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: op('recordPayment'),
		routing: { send: { type: 'body', property: 'invoice_id', value: '={{Number($value)}}' } },
	},
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'string',
		default: '',
		required: true,
		placeholder: '1250.00',
		description: 'In dollars, e.g. 1250.00',
		displayOptions: op('recordPayment'),
		routing: { send: { type: 'body', property: 'amount' } },
	},
	{
		displayName: 'Payment Date',
		name: 'paymentDate',
		type: 'string',
		default: '={{$today.toFormat("yyyy-MM-dd")}}',
		required: true,
		placeholder: 'YYYY-MM-DD',
		displayOptions: op('recordPayment'),
		routing: { send: { type: 'body', property: 'payment_date' } },
	},
	{
		displayName: 'Deposit Account Name or ID',
		name: 'depositAccountId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getAssetAccounts' },
		default: '',
		required: true,
		description:
			'The bank or cash account the money went into. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: op('recordPayment'),
		routing: { send: { type: 'body', property: 'deposit_account_id', value: '={{Number($value)}}' } },
	},
	{
		displayName: 'Additional Fields',
		name: 'paymentFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: op('recordPayment'),
		options: [
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'notes' } },
			},
			{
				displayName: 'Payment Method',
				name: 'paymentMethod',
				type: 'string',
				default: '',
				placeholder: 'ACH',
				routing: { send: { type: 'body', property: 'payment_method' } },
			},
			{
				displayName: 'Reference Number',
				name: 'referenceNumber',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'reference_number' } },
			},
		],
	},
];

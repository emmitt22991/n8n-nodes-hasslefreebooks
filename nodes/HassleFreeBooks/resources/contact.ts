import type { INodeProperties } from 'n8n-workflow';
import { idField, unwrap } from './shared';

const show = { resource: ['contact'] };

export const contactDescription: INodeProperties[] = [
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
				action: 'Create a contact',
				description: 'Create a customer or vendor',
				routing: {
					request: { method: 'POST', url: '/contacts' },
					output: unwrap('data.contact'),
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a contact',
				routing: {
					request: { method: 'GET', url: '=/contacts/{{$parameter.contactId}}' },
					output: unwrap('data.contact'),
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many contacts',
				routing: {
					request: { method: 'GET', url: '/contacts' },
					output: unwrap('data.contacts'),
				},
			},
		],
		default: 'create',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'name' } },
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		options: [
			{ name: 'Customer', value: 'customer' },
			{ name: 'Vendor', value: 'vendor' },
			{ name: 'Both', value: 'both' },
		],
		default: 'customer',
		required: true,
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'type' } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...show, operation: ['create'] } },
		options: [
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				routing: { send: { type: 'body', property: 'email' } },
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'phone' } },
			},
		],
	},
	idField('Contact ID', 'contactId', { ...show, operation: ['get'] }),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		options: [
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{ name: 'Customer', value: 'customer' },
					{ name: 'Vendor', value: 'vendor' },
					{ name: 'Both', value: 'both' },
				],
				default: 'customer',
				routing: { send: { type: 'query', property: 'type' } },
			},
			{
				displayName: 'Active',
				name: 'active',
				type: 'boolean',
				default: true,
				description: 'Whether to return active contacts (on) or deactivated ones (off)',
				routing: { send: { type: 'query', property: 'active', value: '={{$value ? "1" : "0"}}' } },
			},
		],
	},
];

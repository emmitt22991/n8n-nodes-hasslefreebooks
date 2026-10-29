import {
	NodeConnectionTypes,
	type ILoadOptionsFunctions,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';
import { accountDescription } from './resources/account';
import { billDescription } from './resources/bill';
import { contactDescription } from './resources/contact';
import { expenseDescription } from './resources/expense';
import { invoiceDescription } from './resources/invoice';
import { apiRequest } from '../shared/transport';

/** Account pickers: the chart of accounts filtered by type, labelled "1000 · Checking". */
async function accountsOfType(this: ILoadOptionsFunctions, types: string[]): Promise<INodePropertyOptions[]> {
	const body = (await apiRequest.call(this, 'GET', '/accounts')) as {
		data?: { accounts?: Array<{ id: number | string; name?: string; code?: string; type?: string }> };
	};
	return (body.data?.accounts ?? [])
		.filter((a) => types.includes(String(a.type ?? '').toLowerCase()))
		.map((a) => ({
			name: [a.code, a.name].filter((part) => part !== undefined && part !== null && part !== '').join(' · '),
			value: String(a.id),
		}));
}

export class HassleFreeBooks implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HassleFreeBooks',
		name: 'hassleFreeBooks',
		icon: { light: 'file:../../icons/hasslefreebooks.svg', dark: 'file:../../icons/hasslefreebooks.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Create contacts, invoices, bills and expenses in HassleFreeBooks',
		defaults: {
			name: 'HassleFreeBooks',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'hassleFreeBooksApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/+$/, "")}}/api/v1',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Bill', value: 'bill' },
					{ name: 'Contact', value: 'contact' },
					{ name: 'Expense', value: 'expense' },
					{ name: 'Invoice', value: 'invoice' },
				],
				default: 'invoice',
			},
			...accountDescription,
			...billDescription,
			...contactDescription,
			...expenseDescription,
			...invoiceDescription,
		],
	};

	methods = {
		loadOptions: {
			async getAssetAccounts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return await accountsOfType.call(this, ['asset']);
			},
			async getExpenseAccounts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return await accountsOfType.call(this, ['expense']);
			},
			async getPaymentAccounts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return await accountsOfType.call(this, ['asset', 'liability']);
			},
		},
	};
}

import { createHmac, timingSafeEqual } from 'crypto';
import {
	NodeApiError,
	NodeConnectionTypes,
	type IDataObject,
	type JsonObject,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';
import { apiRequest } from '../shared/transport';

/**
 * Subscribes the workflow's webhook URL to HassleFreeBooks events when the workflow
 * is activated (POST /api/v1/webhooks/endpoints) and removes it when it is
 * deactivated. Every delivery is signed with the secret HassleFreeBooks returns
 * once, at creation; a delivery whose X-HassleFreBooks-Signature does not match is
 * answered 401 and never starts the workflow.
 */
export class HassleFreeBooksTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HassleFreeBooks Trigger',
		name: 'hassleFreeBooksTrigger',
		icon: { light: 'file:../../icons/hasslefreebooks.svg', dark: 'file:../../icons/hasslefreebooks.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when an invoice or bill is paid, or an invoice or journal entry is created',
		defaults: {
			name: 'HassleFreeBooks Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'hassleFreeBooksApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName:
					'The API key must belong to the business owner: subscribing to events is an owner-only permission in HassleFreeBooks.',
				name: 'ownerNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				options: [
					{
						name: 'Bill Paid',
						value: 'bill.paid',
						description: 'A bill was paid in full',
					},
					{
						name: 'Invoice Created',
						value: 'invoice.created',
						description: 'A new invoice was created',
					},
					{
						name: 'Invoice Paid',
						value: 'invoice.paid',
						description: 'An invoice was paid in full',
					},
					{
						name: 'Transaction Created',
						value: 'transaction.created',
						description: 'A journal entry was created through the API',
					},
				],
				default: ['invoice.paid'],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				if (staticData.endpointId === undefined) {
					return false;
				}
				try {
					await apiRequest.call(this, 'GET', `/webhooks/endpoints/${String(staticData.endpointId)}`);
					return true;
				} catch (error) {
					if (!isNotFound(error)) {
						throw new NodeApiError(this.getNode(), error as JsonObject);
					}
					// Gone on the HassleFreeBooks side (removed on the Automations page): subscribe again.
					delete staticData.endpointId;
					delete staticData.secret;
					return false;
				}
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				const events = this.getNodeParameter('events', []) as string[];
				const response = await apiRequest.call(this, 'POST', '/webhooks/endpoints', {
					name: `n8n: ${this.getWorkflow().name ?? 'workflow'}`.slice(0, 120),
					url: this.getNodeWebhookUrl('default') as string,
					event_types: events,
					is_active: true,
				});
				const data = (response.data ?? {}) as IDataObject;
				const endpoint = (data.endpoint ?? {}) as IDataObject;
				if (endpoint.id === undefined || typeof data.secret !== 'string') {
					return false;
				}
				staticData.endpointId = endpoint.id;
				staticData.secret = data.secret;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				if (staticData.endpointId !== undefined) {
					try {
						await apiRequest.call(this, 'DELETE', `/webhooks/endpoints/${String(staticData.endpointId)}`);
					} catch (error) {
						// A 404 means it was already removed in HassleFreeBooks; anything else is a real failure.
						if (!isNotFound(error)) {
							throw new NodeApiError(this.getNode(), error as JsonObject);
						}
					}
				}
				delete staticData.endpointId;
				delete staticData.secret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const staticData = this.getWorkflowStaticData('node');
		const secret = typeof staticData.secret === 'string' ? staticData.secret : '';
		const request = this.getRequestObject() as unknown as { rawBody?: Buffer };
		const signature = String(this.getHeaderData()['x-hasslefrebooks-signature'] ?? '');

		if (secret === '' || request.rawBody === undefined || !verifySignature(request.rawBody, signature, secret)) {
			const res = this.getResponseObject();
			res.status(401).json({ ok: false, error: 'invalid signature' });
			return { noWebhookResponse: true };
		}

		const body = this.getBodyData() as IDataObject;
		const events = this.getNodeParameter('events', []) as string[];
		if (typeof body.event === 'string' && events.length > 0 && !events.includes(body.event)) {
			return { webhookResponse: 'ignored' };
		}

		return {
			workflowData: [this.helpers.returnJsonArray(body)],
		};
	}
}

/** The API answered 404: the subscription no longer exists on the HassleFreeBooks side. */
function isNotFound(error: unknown): boolean {
	const e = error as { httpCode?: string | number; response?: { status?: number } } | null;
	return String(e?.httpCode ?? '') === '404' || e?.response?.status === 404;
}

/** sha256=<hex HMAC-SHA256 of the raw body>, compared in constant time. */
export function verifySignature(rawBody: Buffer, header: string, secret: string): boolean {
	const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
	const a = Buffer.from(expected);
	const b = Buffer.from(header);
	return a.length === b.length && timingSafeEqual(a, b);
}

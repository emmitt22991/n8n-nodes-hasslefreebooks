import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';

type Context = IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions | IWebhookFunctions;

/** One authenticated call to the HassleFreeBooks API; returns the parsed {ok, data, meta} envelope. */
export async function apiRequest(
	this: Context,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('hassleFreeBooksApi');
	const baseUrl = String(credentials.baseUrl ?? 'https://hasslefreebooks.com').replace(/\/+$/, '');
	return (await this.helpers.httpRequestWithAuthentication.call(this, 'hassleFreeBooksApi', {
		method,
		url: `${baseUrl}/api/v1${path}`,
		body,
		json: true,
		headers: { Accept: 'application/json' },
	})) as IDataObject;
}

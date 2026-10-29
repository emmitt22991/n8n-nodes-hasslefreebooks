import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class HassleFreeBooksApi implements ICredentialType {
	name = 'hassleFreeBooksApi';

	displayName = 'HassleFreeBooks API';

	icon: Icon = { light: 'file:../icons/hasslefreebooks.svg', dark: 'file:../icons/hasslefreebooks.dark.svg' };

	documentationUrl = 'https://hasslefreebooks.com/automations';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'An API key from the API Keys page in HassleFreeBooks, with the read and write scopes. The trigger needs a key created by the business owner.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://hasslefreebooks.com',
			description: 'Leave as is unless HassleFreeBooks support gave you another address',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/+$/, "")}}/api/v1',
			url: '/me',
			method: 'GET',
		},
	};
}

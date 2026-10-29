import type { INodeProperties } from 'n8n-workflow';

/** Every HassleFreeBooks response is {ok, data, meta}; unwrap to the part a workflow wants. */
export function unwrap(property: string) {
	return {
		postReceive: [
			{
				type: 'rootProperty' as const,
				properties: { property },
			},
		],
	};
}

export const idField = (displayName: string, name: string, show: Record<string, string[]>): INodeProperties => ({
	displayName,
	name,
	type: 'string',
	default: '',
	required: true,
	displayOptions: { show },
});

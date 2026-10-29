/**
 * Exercises the built nodes (dist/) without an n8n server: the trigger's
 * subscribe / check / unsubscribe lifecycle and its signature check, against
 * mocked n8n contexts, and the action node's request routing.
 *
 * Run: npm test   (builds first)
 */
import { createHmac } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { HassleFreeBooksTrigger, verifySignature } = require('../dist/nodes/HassleFreeBooksTrigger/HassleFreeBooksTrigger.node.js');
const { HassleFreeBooks } = require('../dist/nodes/HassleFreeBooks/HassleFreeBooks.node.js');
const { HassleFreeBooksApi } = require('../dist/credentials/HassleFreeBooksApi.credentials.js');

let failures = 0;
let checks = 0;
const check = (label, ok) => {
	checks++;
	console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}`);
	if (!ok) failures++;
};

const sign = (body, secret) => 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');

// ------------------------------------------------------------- signature
const body = Buffer.from('{"id":"evt_invoice_paid_1_p2","event":"invoice.paid"}');
check('a correct signature verifies', verifySignature(body, sign(body, 's3cret'), 's3cret'));
check('a signature made with another secret is refused', !verifySignature(body, sign(body, 'other'), 's3cret'));
check('an altered body is refused', !verifySignature(Buffer.from(body.toString() + ' '), sign(body, 's3cret'), 's3cret'));
check('a missing signature is refused', !verifySignature(body, '', 's3cret'));
check('a bare hex signature (no sha256= prefix) is refused', !verifySignature(body, sign(body, 's3cret').slice(7), 's3cret'));

// ------------------------------------------------------- trigger lifecycle
const calls = [];
function hookContext(staticData, responder) {
	return {
		getWorkflowStaticData: () => staticData,
		getNodeParameter: (name) => (name === 'events' ? ['invoice.paid', 'bill.paid'] : undefined),
		getWorkflow: () => ({ name: 'Paid invoices to Slack' }),
		getNodeWebhookUrl: () => 'https://n8n.example.com/webhook/abc-123',
		getNode: () => ({ name: 'HassleFreeBooks Trigger', type: 'hassleFreeBooksTrigger', typeVersion: 1 }),
		getCredentials: async () => ({ apiKey: 'hfb_test', baseUrl: 'https://hasslefreebooks.com/' }),
		helpers: {
			httpRequestWithAuthentication: async (cred, opts) => {
				calls.push({ cred, ...opts });
				return responder(opts);
			},
		},
	};
}

const trigger = new HassleFreeBooksTrigger();
const hooks = trigger.webhookMethods.default;
const staticData = {};
let ctx = hookContext(staticData, () => ({ ok: true, data: { endpoint: { id: 41 }, secret: 'abc' } }));
check('checkExists is false before anything was created', (await hooks.checkExists.call(ctx)) === false);
check('create subscribes', (await hooks.create.call(ctx)) === true);
const created = calls.at(-1);
check('create POSTs /api/v1/webhooks/endpoints on the credential base URL', created.method === 'POST' && created.url === 'https://hasslefreebooks.com/api/v1/webhooks/endpoints');
check('create sends the webhook URL and chosen events', created.body.url === 'https://n8n.example.com/webhook/abc-123' && created.body.event_types.join() === 'invoice.paid,bill.paid');
check('create names the subscription "n8n: <workflow>"', created.body.name === 'n8n: Paid invoices to Slack');
check('create uses the HassleFreeBooks credential', created.cred === 'hassleFreeBooksApi');
check('the endpoint id and secret are kept', staticData.endpointId === 41 && staticData.secret === 'abc');

ctx = hookContext(staticData, () => ({ ok: true, data: { endpoint: { id: 41 } } }));
check('checkExists is true while the subscription exists', (await hooks.checkExists.call(ctx)) === true);

ctx = hookContext(staticData, () => {
	const e = new Error('not found');
	e.httpCode = '404';
	throw e;
});
check('checkExists is false (and forgets it) once it was removed in HassleFreeBooks', (await hooks.checkExists.call(ctx)) === false && staticData.endpointId === undefined);

ctx = hookContext(staticData, () => {
	const e = new Error('server down');
	e.httpCode = '500';
	throw e;
});
staticData.endpointId = 41;
let threw = false;
try {
	await hooks.checkExists.call(ctx);
} catch {
	threw = true;
}
check('checkExists surfaces a real failure instead of resubscribing', threw && staticData.endpointId === 41);

ctx = hookContext(staticData, () => ({ ok: true, data: { deleted: true } }));
staticData.secret = 'abc';
check('delete unsubscribes', (await hooks.delete.call(ctx)) === true);
check('delete calls DELETE /webhooks/endpoints/41', calls.at(-1).method === 'DELETE' && calls.at(-1).url.endsWith('/api/v1/webhooks/endpoints/41'));
check('delete forgets the id and secret', staticData.endpointId === undefined && staticData.secret === undefined);

ctx = hookContext({}, () => ({ ok: true, data: { endpoint: {} } }));
check('create reports failure when the API returns no id or secret', (await hooks.create.call(ctx)) === false);

// -------------------------------------------------------------- webhook()
function webhookContext(secret, raw, header, events = ['invoice.paid']) {
	const res = { code: 200, payload: null, status(c) { this.code = c; return this; }, json(p) { this.payload = p; return this; } };
	return {
		res,
		ctx: {
			getWorkflowStaticData: () => ({ secret }),
			getRequestObject: () => ({ rawBody: raw }),
			getHeaderData: () => ({ 'x-hasslefrebooks-signature': header }),
			getBodyData: () => JSON.parse(raw.toString()),
			getNodeParameter: () => events,
			getResponseObject: () => res,
			helpers: { returnJsonArray: (d) => [{ json: d }] },
		},
	};
}

let w = webhookContext('abc', body, sign(body, 'abc'));
let out = await trigger.webhook.call(w.ctx);
check('a signed delivery starts the workflow with the envelope', out.workflowData?.[0]?.[0]?.json?.event === 'invoice.paid');

w = webhookContext('abc', body, sign(body, 'wrong'));
out = await trigger.webhook.call(w.ctx);
check('a forged delivery is answered 401 and starts nothing', w.res.code === 401 && out.noWebhookResponse === true && out.workflowData === undefined);

w = webhookContext('', body, sign(body, ''));
out = await trigger.webhook.call(w.ctx);
check('with no stored secret nothing is accepted', w.res.code === 401 && out.workflowData === undefined);

w = webhookContext('abc', body, sign(body, 'abc'), ['bill.paid']);
out = await trigger.webhook.call(w.ctx);
check('an event the node did not choose is acknowledged but not run', out.workflowData === undefined && out.webhookResponse === 'ignored');

// ---------------------------------------------------------- action routing
const node = new HassleFreeBooks();
const routes = [];
const walk = (props) => {
	for (const p of props) {
		for (const o of p.options ?? []) {
			if (o.routing?.request) routes.push(`${o.routing.request.method} ${o.routing.request.url}`);
		}
	}
};
walk(node.description.properties);
const expected = [
	'GET /accounts', 'POST /bills', 'POST /contacts', 'GET =/contacts/{{$parameter.contactId}}', 'GET /contacts',
	'POST /expenses', 'POST /invoices', 'POST =/invoices/{{$parameter.invoiceId}}/finalize', 'GET =/invoices/{{$parameter.invoiceId}}',
	'GET /invoices', 'POST /invoices/record-payment', 'POST =/invoices/{{$parameter.invoiceId}}/send',
];
for (const r of expected) check(`routes ${r}`, routes.includes(r));
check('no unexpected routes', routes.length === expected.length);
check('requests go to <base>/api/v1', node.description.requestDefaults.baseURL.includes('/api/v1'));
check('usable as an AI tool', node.description.usableAsTool === true);

const cred = new HassleFreeBooksApi();
check('credential sends Authorization: Bearer <key>', cred.authenticate.properties.headers.Authorization === '=Bearer {{$credentials.apiKey}}');
check('credential test calls GET /me', cred.test.request.url === '/me' && cred.test.request.method === 'GET');
check('the API key is a password field', cred.properties.find((p) => p.name === 'apiKey').typeOptions.password === true);

console.log(`\n${checks - failures}/${checks} passed`);
process.exit(failures === 0 ? 0 : 1);

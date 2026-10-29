# n8n-nodes-hasslefreebooks

n8n community nodes for [HassleFreeBooks](https://hasslefreebooks.com), small-business accounting.

- **HassleFreeBooks** — create contacts, invoices, bills and expenses; finalize, send and record payments on invoices; get and list invoices, contacts and the chart of accounts. Usable as an AI agent tool.
- **HassleFreeBooks Trigger** — start a workflow when an invoice is paid or created, a bill is paid, or a journal entry is created.

[Installation](#installation) · [Credentials](#credentials) · [Operations](#operations) · [Trigger](#trigger) · [Compatibility](#compatibility)

## Installation

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) and install `n8n-nodes-hasslefreebooks`.

## Credentials

1. In HassleFreeBooks, open **API Keys** (https://hasslefreebooks.com/api-keys). API keys are created by the business owner.
2. Create a key with the **read** and **write** scopes.
3. In n8n, create a **HassleFreeBooks API** credential and paste the key. Leave Base URL as `https://hasslefreebooks.com`.

The trigger subscribes to events for the whole business, which only the owner may do, so it needs a key the owner created.

## Operations

| Resource | Operations |
|---|---|
| Account | Get Many |
| Bill | Create |
| Contact | Create, Get, Get Many |
| Expense | Create |
| Invoice | Create, Finalize, Get, Get Many, Record Payment, Send |

Amounts are entered in dollars (`125.00`). An invoice's subtotal and total are the sum of its lines, calculated by HassleFreeBooks. Anything else in the [API reference](https://hasslefreebooks.com/docs/api) can be called with the HTTP Request node using this credential.

## Trigger

Activating the workflow registers its webhook URL in HassleFreeBooks (it appears on the **Automations** page); deactivating removes it. n8n must be reachable from the internet over https.

Every delivery is signed: `X-HassleFreBooks-Signature: sha256=<HMAC-SHA256 of the raw body>` with the secret HassleFreeBooks returns when the webhook is created. The node checks it and answers 401 to anything unsigned or altered, so a forged request never starts the workflow.

Each event is a JSON envelope:

```json
{
  "id": "evt_invoice_paid_1042_p77",
  "event": "invoice.paid",
  "entity_id": 7,
  "resource_id": 1042,
  "occurred_at": "2026-10-29T15:04:05Z",
  "data": { "amount": "1250.00", "amount_cents": 125000, "invoice": { "invoice_number": "INV-1042", "contact_name": "Acme Landscaping LLC" } }
}
```

`id` repeats if a delivery is retried; use it to skip duplicates.

## Compatibility

Built with `@n8n/node-cli` and tested against n8n 1.x. No runtime dependencies.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [HassleFreeBooks API reference](https://hasslefreebooks.com/docs/api)

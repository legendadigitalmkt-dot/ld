# WhatsApp Channel Foundation

This milestone connects LD Growth OS to the official WhatsApp Business Platform Cloud API.

## Runtime contract

Webhook endpoint:

```
GET|POST /api/webhooks/meta/whatsapp
```

GET performs Meta's verification-token challenge.

POST:
1. reads the raw request body;
2. verifies `X-Hub-Signature-256` using the Meta App Secret;
3. rejects invalid signatures before parsing/persisting;
4. hashes the verified envelope for webhook idempotency;
5. resolves the tenant from Meta `metadata.phone_number_id`;
6. persists inbound messages and status transitions.

## Environment

```
META_GRAPH_API_VERSION=v26.0
META_WHATSAPP_ACCESS_TOKEN=...
META_APP_SECRET=...
META_WEBHOOK_VERIFY_TOKEN=...
NEXT_PUBLIC_APP_URL=https://your-public-app.example
```

The access token and app secret are server-only. They are never persisted in Postgres or exposed through `NEXT_PUBLIC_*`.

The token must have the Meta permissions required by the operation, primarily:
- `whatsapp_business_management`
- `whatsapp_business_messaging`

## Connection flow

Owner/admin opens `/app/settings/integrations` and supplies:
- WABA ID
- Phone Number ID

The server:
1. fetches WABA phone numbers from Meta;
2. confirms the Phone Number ID belongs to the WABA;
3. subscribes the app to `/{WABA-ID}/subscribed_apps`;
4. uses the LD callback as an override when `NEXT_PUBLIC_APP_URL` is public HTTPS;
5. persists only non-secret identifiers and metadata.

## Inbound flow

```text
Meta webhook
  -> signature verification
  -> phone_number_id -> workspace
  -> exact-envelope idempotency record
  -> wa_id -> contact_channels
  -> existing contact OR automatic lead creation
  -> automatic New-stage deal for a genuinely new lead
  -> WhatsApp conversation
  -> message persistence
  -> unread increment / activity
```

A contact can exist independently of a channel while `contact_channels` binds a WhatsApp `wa_id` to that CRM contact.

## Outbound flow

Messages are sent from the Inbox using:

```
POST /v26.0/{PHONE_NUMBER_ID}/messages
```

Only after Meta returns a message ID does the server persist the outbound message. Authenticated browser clients no longer have direct INSERT permission on `messages`, preventing fake outbound records.

## Delivery state

Current state is stored on `messages.delivery_status`:

```text
pending -> sent -> delivered -> read
                   \-> failed
```

Every received transition is also appended to `message_status_events`. Out-of-order lower-rank callbacks do not regress the current message state.

## Idempotency

Two independent protections are used:
- `webhook_events(provider,event_key)` deduplicates exact webhook envelopes.
- `messages(workspace_id,external_message_id)` deduplicates Meta message IDs.

Status history additionally uses `unique(message_id,status,occurred_at)`.

## Privacy

Raw webhook envelopes are not stored wholesale. The system stores:
- message content required by the Inbox;
- selected operational metadata;
- a SHA-256 payload hash;
- event processing metadata.

This reduces unnecessary retention of webhook payload data.

## External gate before real message testing

A publicly reachable deployment and Meta assets are still required:
- Meta Business Portfolio
- Meta App with WhatsApp product
- WABA
- registered business phone number / Phone Number ID
- server-side access token
- App Secret
- verification token
- public HTTPS LD Growth OS URL

Once these are configured, use the Integrations screen to validate/subscribe the WABA and then send a real WhatsApp message to the connected number.

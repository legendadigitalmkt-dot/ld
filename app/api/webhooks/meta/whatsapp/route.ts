import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import {
  verifyWhatsAppWebhookChallenge,
  verifyWhatsAppWebhookSignature,
} from '@/lib/meta/whatsapp'
import {
  processWhatsAppWebhook,
  type WhatsAppWebhookPayload,
} from '@/lib/meta/whatsapp-webhook'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (!challenge || !verifyWhatsAppWebhookChallenge(mode, token)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  return new NextResponse(challenge, {
    status: 200,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}

export async function POST(request: Request) {
  const rawBody = Buffer.from(await request.arrayBuffer())
  const signature = request.headers.get('x-hub-signature-256')

  if (!verifyWhatsAppWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, error: 'invalid_signature' }, { status: 401 })
  }

  let payload: WhatsAppWebhookPayload
  try {
    payload = JSON.parse(rawBody.toString('utf8')) as WhatsAppWebhookPayload
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  if (payload.object !== 'whatsapp_business_account') {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const payloadHash = createHash('sha256').update(rawBody).digest('hex')

  try {
    const result = await processWhatsAppWebhook({
      payload,
      eventKey: payloadHash,
      payloadHash,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('WhatsApp webhook processing failed', error)
    return NextResponse.json({ ok: false, error: 'processing_failed' }, { status: 500 })
  }
}

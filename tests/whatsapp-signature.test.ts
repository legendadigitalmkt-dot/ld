import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'
import { verifyHmacSha256 } from '../lib/meta/webhook-signature.ts'

test('accepts a valid Meta-style sha256 signature', () => {
  const secret = 'ld-test-app-secret'
  const body = Buffer.from('{"object":"whatsapp_business_account","entry":[]}', 'utf8')
  const digest = createHmac('sha256', secret).update(body).digest('hex')

  assert.equal(verifyHmacSha256(body, `sha256=${digest}`, secret), true)
})

test('rejects a modified body', () => {
  const secret = 'ld-test-app-secret'
  const original = Buffer.from('{"ok":true}', 'utf8')
  const changed = Buffer.from('{"ok":false}', 'utf8')
  const digest = createHmac('sha256', secret).update(original).digest('hex')

  assert.equal(verifyHmacSha256(changed, `sha256=${digest}`, secret), false)
})

test('rejects malformed or missing signatures', () => {
  const body = Buffer.from('{}', 'utf8')
  assert.equal(verifyHmacSha256(body, null, 'secret'), false)
  assert.equal(verifyHmacSha256(body, 'not-sha256', 'secret'), false)
  assert.equal(verifyHmacSha256(body, 'sha256=1234', 'secret'), false)
})

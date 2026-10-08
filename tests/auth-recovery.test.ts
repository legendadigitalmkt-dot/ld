import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { createRecoveryClient } from '../lib/supabase/recovery-client.ts'

test('a rate-limited retry preserves the verifier for the previously sent recovery email', async () => {
  const values = new Map<string, string>()
  const store = {
    getAll: () => Array.from(values, ([name, value]) => ({ name, value })),
    set: (name: string, value: string) => { values.set(name, value) },
  }
  const originalFetch = globalThis.fetch
  let recoverRequests = 0
  let firstChallenge = ''
  let exchangeVerifier = ''
  globalThis.fetch = async (input, init) => {
    const url = String(input)
    const body = JSON.parse(String(init?.body || '{}'))
    if (url.includes('/recover')) {
      recoverRequests++
      if (recoverRequests === 1) {
        firstChallenge = body.code_challenge
        return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({ code: 'over_email_send_rate_limit', message: 'Rate limited' }), {
        status: 429, headers: { 'Content-Type': 'application/json' },
      })
    }
    if (url.includes('/token')) {
      exchangeVerifier = body.code_verifier
      // The test only needs to validate the selected verifier, not issue a real session.
      return new Response(JSON.stringify({ code: 'invalid_grant', message: 'Synthetic test code' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      })
    }
    throw new Error('Unexpected request in recovery regression test')
  }

  try {
    const first = createRecoveryClient('https://example.supabase.co', 'test-key', store)
    const sent = await first.supabase.auth.resetPasswordForEmail('owner@example.com')
    assert.equal(sent.error, null)
    first.commitCookies()
    const saved = new Map(values)

    const retry = createRecoveryClient('https://example.supabase.co', 'test-key', store)
    const failed = await retry.supabase.auth.resetPasswordForEmail('owner@example.com')
    assert.equal(failed.error?.status, 429)
    // Production commits only after a successful request.
    assert.deepEqual(values, saved)

    const callback = createRecoveryClient('https://example.supabase.co', 'test-key', store)
    await callback.supabase.auth.exchangeCodeForSession('synthetic-code')
    assert.ok(exchangeVerifier)
    assert.equal(createHash('sha256').update(exchangeVerifier).digest('base64url'), firstChallenge)
  } finally {
    globalThis.fetch = originalFetch
  }
})

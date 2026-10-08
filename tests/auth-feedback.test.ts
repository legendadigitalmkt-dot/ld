import assert from 'node:assert/strict'
import test from 'node:test'
import { authErrorMessage, authRedirectPath, readCredentials } from '../lib/auth-feedback.ts'

test('keeps password whitespace while normalizing only the email', () => {
  const form = new FormData()
  form.set('email', ' Owner@Example.com ')
  form.set('password', '  secret with spaces  ')
  assert.deepEqual(readCredentials(form), { email: 'owner@example.com', password: '  secret with spaces  ' })
})

test('unconfirmed emails are not reported as wrong passwords', () => {
  assert.match(authErrorMessage({ code: 'email_not_confirmed' }), /Confirme seu e-mail/)
  assert.match(authErrorMessage({ code: 'invalid_credentials' }), /E-mail ou senha inválidos/)
  assert.match(authErrorMessage({ status: 429 }), /Muitas tentativas/)
  assert.match(authErrorMessage({ code: 'unknown', status: 503 }), /Não foi possível/)
})

test('callback blocks external and protocol-relative destinations', () => {
  for (const path of ['https://evil.example', '//evil.example', '/\\evil.example', null]) {
    assert.equal(authRedirectPath(path), '/app')
  }
  assert.equal(authRedirectPath('/reset-password'), '/reset-password')
  assert.equal(authRedirectPath('/onboarding'), '/onboarding')
})

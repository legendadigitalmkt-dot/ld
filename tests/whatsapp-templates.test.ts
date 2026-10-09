import assert from 'node:assert/strict'
import test from 'node:test'
import { parseApprovedTemplates, prepareTemplateMessage, renderTemplate } from '../lib/meta/whatsapp-templates.ts'

const base = { id: '1', name: 'welcome', language: 'pt_BR', category: 'UTILITY', status: 'APPROVED' }
const parse = (components: unknown[]) => parseApprovedTemplates({ data: [{ ...base, components }] })[0]
test('unapproved and malformed template definitions are excluded', () => {
  assert.deepEqual(parseApprovedTemplates({ data: [{ ...base, status: 'PAUSED' }, { status: 'APPROVED' }] }), [])
  assert.throws(() => parseApprovedTemplates({ error: 'not a template list' }))
})
test('a static approved template needs no components in the send request', () => {
  const template = parse([{ type: 'HEADER', format: 'TEXT', text: 'Bem-vindo' }, { type: 'BODY', text: 'Olá!' }, { type: 'FOOTER', text: 'Legenda Digital' }])
  assert.equal(template.unsupportedReason, null)
  assert.deepEqual(prepareTemplateMessage(template, {}), { components: [], body: 'Bem-vindo\n\nOlá!\n\nLegenda Digital' })
})
test('positional parameters are ordered by number, deduplicated and kept in their component', () => {
  const template = parse([{ type: 'HEADER', format: 'TEXT', text: 'Pedido {{1}}' }, { type: 'BODY', text: '{{2}}: Olá {{1}}, {{1}}!' }])
  assert.deepEqual(prepareTemplateMessage(template, { header_1: '10', body_1: 'Ana', body_2: 'Equipe' }).components, [
    { type: 'header', parameters: [{ type: 'text', text: '10' }] },
    { type: 'body', parameters: [{ type: 'text', text: 'Ana' }, { type: 'text', text: 'Equipe' }] },
  ])
})
test('named parameters carry parameter_name and render values as plain text', () => {
  const template = parse([{ type: 'BODY', text: 'Olá {{first_name}}, pedido {{order_id}}.' }])
  const values = { body_first_name: ' Ana ', body_order_id: '<123>' }
  assert.deepEqual(prepareTemplateMessage(template, values).components[0].parameters, [
    { type: 'text', text: 'Ana', parameter_name: 'first_name' }, { type: 'text', text: '<123>', parameter_name: 'order_id' },
  ])
  assert.equal(renderTemplate(template, values), 'Olá Ana, pedido <123>.')
})
test('missing values and provider parameter size limits stop template sends', () => {
  const template = parse([{ type: 'HEADER', format: 'TEXT', text: '{{1}}' }, { type: 'BODY', text: '{{1}}' }])
  assert.throws(() => prepareTemplateMessage(template, {}), /header_1/)
  assert.throws(() => prepareTemplateMessage(template, { header_1: 'a'.repeat(61), body_1: 'ok' }), /60 caracteres/)
  assert.throws(() => prepareTemplateMessage(template, { header_1: 'ok', body_1: 'a'.repeat(1025) }), /1024 caracteres/)
})
test('unsupported media, buttons, OTP and invalid variable formats cannot be sent', () => {
  for (const components of [
    [{ type: 'HEADER', format: 'IMAGE' }, { type: 'BODY', text: 'Olá' }],
    [{ type: 'BODY', text: 'Olá' }, { type: 'BUTTONS', buttons: [] }],
    [{ type: 'BODY', text: '{{2}}' }],
    [{ type: 'BODY', text: '{{1}} {{name}}' }],
  ]) assert.throws(() => prepareTemplateMessage(parse(components), {}))
  const otp = parseApprovedTemplates({ data: [{ ...base, category: 'AUTHENTICATION', components: [{ type: 'BODY', text: 'Código' }] }] })[0]
  assert.throws(() => prepareTemplateMessage(otp, {}), /autenticação/)
})

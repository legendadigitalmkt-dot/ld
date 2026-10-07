import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const PORT = 32123;
const WS = 'ws_clinica_viva';
let child;
let tmp;

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/api/health`);
      if (r.ok) return;
    } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Server did not start');
}

async function api(route, options={}) {
  const r = await fetch(`http://127.0.0.1:${PORT}${route}`, {
    ...options,
    headers: {'content-type':'application/json','x-workspace-id':WS,...(options.headers||{})}
  });
  const json = await r.json();
  return {status:r.status, json};
}

test.before(async () => {
  tmp = await mkdtemp(path.join(os.tmpdir(), 'ld-growth-test-'));
  child = spawn(process.execPath, ['server.mjs'], {
    cwd: path.resolve(import.meta.dirname, '..'),
    env: {...process.env, PORT:String(PORT), DATA_DIR:tmp},
    stdio: ['ignore','pipe','pipe']
  });
  await waitForServer();
});

test.after(async () => {
  child?.kill('SIGTERM');
  if (tmp) await rm(tmp, {recursive:true, force:true});
});

test('health endpoint is available', async () => {
  const {status,json} = await api('/api/health');
  assert.equal(status, 200);
  assert.equal(json.ok, true);
});

test('state returns CRM metrics and follow-up risks', async () => {
  const {status,json} = await api('/api/state');
  assert.equal(status, 200);
  assert.equal(json.workspaces[0].id, WS);
  assert.ok(json.metrics.pipelineValue > 0);
  assert.ok(json.followups.length >= 1);
});

test('contact can be created and stays scoped to workspace', async () => {
  const created = await api('/api/contacts', {method:'POST', body:JSON.stringify({name:'Teste Piloto',phone:'+5515000000000',source:'Manual'})});
  assert.equal(created.status, 201);
  assert.equal(created.json.workspaceId, WS);
  const state = await api('/api/state');
  assert.ok(state.json.contacts.some(c => c.id === created.json.id));
});

test('deal can move through pipeline', async () => {
  const state = await api('/api/state');
  const deal = state.json.deals.find(d => d.stage === 'new');
  assert.ok(deal);
  const moved = await api(`/api/deals/${deal.id}`, {method:'PATCH', body:JSON.stringify({stage:'qualified'})});
  assert.equal(moved.status, 200);
  assert.equal(moved.json.stage, 'qualified');
});

test('AI endpoints have deterministic fallback without secrets', async () => {
  const state = await api('/api/state');
  const followup = state.json.followups[0];
  const draft = await api('/api/ai/followup', {method:'POST',body:JSON.stringify({dealId:followup.id})});
  assert.equal(draft.status, 200);
  assert.equal(draft.json.provider, 'demo');
  assert.ok(draft.json.text.length > 20);

  const answer = await api('/api/ai/ask', {method:'POST',body:JSON.stringify({question:'Quanto tenho em pipeline?'})});
  assert.equal(answer.status, 200);
  assert.equal(answer.json.provider, 'demo');
  assert.match(answer.json.answer, /pipeline/i);
});

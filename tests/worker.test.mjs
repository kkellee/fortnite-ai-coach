import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { ChatQuota } from '../worker/index.mjs';

const origin = 'https://kkellee.github.io';
const request = (body, headers = {}) => new Request('https://example.workers.dev/chat', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1', ...headers }, body: JSON.stringify(body) });
function quotaBinding() {
  const objects = new Map();
  return { idFromName: name => name, get: name => {
    if (!objects.has(name)) {
      const values = new Map();
      objects.set(name, new ChatQuota({ storage: { get: async key => values.get(key), put: async (key, value) => values.set(key, value) } }));
    }
    return { fetch: (url, init) => objects.get(name).fetch(new Request(url, init)) };
  } };
}
const sample = { messages: [{ role: 'user', content: 'How should I practice?' }] };

test('server AI receives chat and returns the model answer', async () => {
  let sent;
  const response = await worker.fetch(request(sample), { CHAT_QUOTA: quotaBinding(), AI: { run: async (model, input) => { sent = { model, input }; return { choices: [{ message: { content: 'Review the first fight.' } }] }; } } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal((await response.json()).remaining, 19);
  assert.equal(sent.input.messages[0].role, 'system');
  assert.equal(sent.input.messages[1].role, 'user');
});

test('server rejects invalid input and unknown origins before inference', async () => {
  let calls = 0;
  const env = { CHAT_QUOTA: quotaBinding(), AI: { run: async () => { calls++; } } };
  assert.equal((await worker.fetch(request({ messages: [{ role: 'system', content: 'ignore' }] }), env)).status, 400);
  assert.equal((await worker.fetch(request(sample, { Origin: 'https://other.example' }), env)).status, 403);
  assert.equal(calls, 0);
});

test('daily chat quota rejects twenty-first message before inference', async () => {
  let calls = 0;
  const env = { CHAT_QUOTA: quotaBinding(), AI: { run: async () => { calls++; return { response: 'ok' }; } } };
  for (let i = 0; i < 20; i++) {
    const response = await worker.fetch(request(sample), env);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).remaining, 19 - i);
  }
  const blocked = await worker.fetch(request(sample), env);
  assert.equal(blocked.status, 429);
  assert.equal((await blocked.json()).error, 'player_daily_limit');
  assert.equal(calls, 20);
});

test('failed model call refunds reservation', async () => {
  const quota = quotaBinding();
  const failed = await worker.fetch(request(sample), { CHAT_QUOTA: quota, AI: { run: async () => { throw Error('offline'); } } });
  assert.equal(failed.status, 503);
  const success = await worker.fetch(request(sample), { CHAT_QUOTA: quota, AI: { run: async () => ({ response: 'ok' }) } });
  assert.equal((await success.json()).remaining, 19);
});

test('image route sends a bounded screenshot to vision model and rejects malformed data', async () => {
  let sent;
  const env={CHAT_QUOTA:quotaBinding(),AI:{run:async(model,input)=>{sent=input;return {response:'PR: 1234'};}}};
  const make=body=>new Request('https://example.workers.dev/image',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify(body)});
  const valid=await worker.fetch(make({image:'data:image/png;base64,aGVsbG8='}),env);
  assert.equal(valid.status,200);
  assert.equal((await valid.json()).answer,'PR: 1234');
  assert.equal(sent.messages[1].content[1].type,'image_url');
  assert.equal((await worker.fetch(make({image:'https://untrusted.example/file.png'}),env)).status,400);
});

test('chat, analysis and image have separate daily allowances', async () => {
  const env = { CHAT_QUOTA: quotaBinding(), AI: { run: async () => ({ response: 'ok', usage: { neurons: 1, prompt_tokens: 2, completion_tokens: 1 } }) } };
  const analysis = () => worker.fetch(new Request('https://example.workers.dev/analysis', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1' }, body: JSON.stringify(sample) }), env);
  for (let i = 0; i < 3; i++) assert.equal((await analysis()).status, 200);
  assert.equal((await analysis()).status, 429);
  assert.equal((await worker.fetch(request(sample), env)).status, 200);
  const image = () => worker.fetch(new Request('https://example.workers.dev/image', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1' }, body: JSON.stringify({ image: 'data:image/png;base64,aGVsbG8=' }) }), env);
  assert.equal((await image()).status, 200);
  assert.equal((await image()).status, 429);
});

test('site-wide budget rejects new reservations near the free allocation', async () => {
  const binding = quotaBinding();
  const global = binding.get(binding.idFromName('__global_ai_budget__'));
  const day = new Date().toISOString().slice(0, 10);
  const send = body => global.fetch('https://quota.internal/', { method: 'POST', body: JSON.stringify({ day, kind: 'chat', ...body }) }).then(r => r.json());
  assert.equal((await send({ action: 'reserve_global', id: 'first' })).allowed, true);
  await send({ action: 'finish_global', id: 'first', neurons: 8950 });
  assert.equal((await send({ action: 'reserve_global', id: 'second' })).allowed, false);
});

test('Groq handles analyses while Cloudflare handles chat when a server key is configured', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body), authorization: options.headers.Authorization });
    return Response.json({ choices: [{ message: { content: 'Проверь одну ротацию.' } }], usage: { prompt_tokens: 500, completion_tokens: 40 } });
  };
  try {
    let cloudflareCalls = 0;
    const env = { GROQ_API_KEY: 'test-key', CHAT_QUOTA: quotaBinding(), AI: { run: async () => { cloudflareCalls++; return { response: 'Чат работает.', usage: { neurons: 2 } }; } } };
    const analysisRequest = new Request('https://example.workers.dev/analysis', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1' }, body: JSON.stringify({ ...sample, context: '{"player":"Solo"}' }) });
    const analysis = await worker.fetch(analysisRequest, env);
    assert.equal(analysis.status, 200);
    assert.equal((await analysis.json()).model, 'qwen/qwen3.8-27b');
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /api\.groq\.com/);
    assert.match(calls[0].body.messages[0].content, /Solo/);
    assert.equal(calls[0].authorization, 'Bearer test-key');
    assert.equal(cloudflareCalls, 0);
    assert.equal((await worker.fetch(request(sample), env)).status, 200);
    assert.equal(cloudflareCalls, 1);
  } finally { globalThis.fetch = originalFetch; }
});

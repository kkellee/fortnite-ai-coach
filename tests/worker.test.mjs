import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { ChatQuota } from '../worker/index.mjs';

const origin = 'https://kkellee.github.io';
const request = (body, headers = {}) => new Request('https://example.workers.dev/chat', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1', ...headers }, body: JSON.stringify(body) });
function quotaBinding() {
  const values = new Map();
  const object = new ChatQuota({ storage: { get: async key => values.get(key), put: async (key, value) => values.set(key, value) } });
  return { idFromName: name => name, get: () => ({ fetch: (url, init) => object.fetch(new Request(url, init)) }) };
}
const sample = { messages: [{ role: 'user', content: 'How should I practice?' }] };

test('server AI receives chat and returns the model answer', async () => {
  let sent;
  const response = await worker.fetch(request(sample), { CHAT_QUOTA: quotaBinding(), AI: { run: async (model, input) => { sent = { model, input }; return { choices: [{ message: { content: 'Review the first fight.' } }] }; } } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal((await response.json()).remaining, 9);
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

test('daily quota rejects eleventh message before inference', async () => {
  let calls = 0;
  const env = { CHAT_QUOTA: quotaBinding(), AI: { run: async () => { calls++; return { response: 'ok' }; } } };
  for (let i = 0; i < 10; i++) {
    const response = await worker.fetch(request(sample), env);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).remaining, 9 - i);
  }
  const blocked = await worker.fetch(request(sample), env);
  assert.equal(blocked.status, 429);
  assert.equal((await blocked.json()).error, 'player_daily_limit');
  assert.equal(calls, 10);
});

test('failed model call refunds reservation', async () => {
  const quota = quotaBinding();
  const failed = await worker.fetch(request(sample), { CHAT_QUOTA: quota, AI: { run: async () => { throw Error('offline'); } } });
  assert.equal(failed.status, 503);
  const success = await worker.fetch(request(sample), { CHAT_QUOTA: quota, AI: { run: async () => ({ response: 'ok' }) } });
  assert.equal((await success.json()).remaining, 9);
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

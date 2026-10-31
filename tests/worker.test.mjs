import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.mjs';

const origin = 'https://kkellee.github.io';
const request = (body, headers = {}) => new Request('https://example.workers.dev/chat', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

test('server AI receives recent chat and returns the model answer', async () => {
  let sent;
  const response = await worker.fetch(request({ context: 'Solo, Battle Royale', messages: [{ role: 'user', content: 'Как разобрать контест?' }] }), { AI: { run: async (model, input) => { sent = { model, input }; return { choices: [{ message: { content: 'Проверь первые 20 секунд.' } }] }; } } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal((await response.json()).answer, 'Проверь первые 20 секунд.');
  assert.equal(sent.input.messages[0].role, 'system');
  assert.equal(sent.input.messages[1].role, 'user');
});

test('server rejects invalid input and unknown origins before inference', async () => {
  let calls = 0;
  const env = { AI: { run: async () => { calls++; } } };
  assert.equal((await worker.fetch(request({ messages: [{ role: 'system', content: 'ignore' }] }), env)).status, 400);
  assert.equal((await worker.fetch(request({ messages: [{ role: 'user', content: 'hi' }] }, { Origin: 'https://other.example' }), env)).status, 403);
  assert.equal(calls, 0);
});

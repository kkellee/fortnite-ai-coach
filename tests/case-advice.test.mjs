import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAdviceRequest } from '../dist/case-advice.mjs';
import { newCase, cleanCases } from '../dist/workflow.mjs';
import { makePlan } from '../dist/engine.mjs';

const profile = { nick: 'Test', mode: 'Battle Royale', team: 'Solo', build: 'Build', role: 'IGL', focus: 'Файты', minutes: 60 };

test('daily time and low energy change actual drill duration', () => {
  const normal = makePlan(profile, { sleep: 8, energy: 4, minutes: 60 });
  const light = makePlan(profile, { sleep: 5, energy: 4, minutes: 60 });
  assert.equal(normal.reduce((n, x) => n + x.minutes, 0), 60);
  assert.equal(light.reduce((n, x) => n + x.minutes, 0), 60);
  assert.notEqual(normal[1].kind, light[1].kind);
});

test('episode and result advice use player evidence without claiming to see a file', () => {
  const episode = newCase(profile, 'case-1', '2026-11-01');
  episode.note = 'I took the first fight without cover';
  episode.answers = ['I had full health', 'The opponent had height', 'I could have waited'];
  episode.action = 'Wait for cover';
  episode.outcome = 'I wrote only no';
  const first = buildAdviceRequest(episode, profile, { sleep: 5, energy: 2, minutes: 40 });
  const result = buildAdviceRequest(episode, profile, { sleep: 5, energy: 2, minutes: 40 }, true);
  assert.match(first.messages[0].content, /I took the first fight/);
  assert.match(result.messages[0].content, /I wrote only no/);
  assert.match(result.messages[0].content, /нельзя оценить игру/);
  assert.equal(first.context.includes('"energyOfFive":2'), true);
  assert.ok(first.messages[0].content.length <= 1800);
  episode.aiAdvice = 'First feedback';
  episode.aiOutcomeAdvice = 'Result feedback';
  assert.equal(cleanCases([episode])[0].aiOutcomeAdvice, 'Result feedback');
});

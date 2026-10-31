import test from 'node:test';
import assert from 'node:assert/strict';
import { isMetaQuestion, metaBrief } from '../worker/meta-knowledge.mjs';

test('meta lookup is triggered for current-patch questions', () => {
  assert.equal(isMetaQuestion('Какая сейчас мета в Reload?'), true);
  assert.equal(isMetaQuestion('Я проиграл контест за локу'), false);
});

test('old season facts expire when the new season begins', () => {
  const old = metaBrief(new Date('2026-10-31T20:00:00Z'));
  assert.match(old, /v42\.40/);
  assert.match(old, /ТОЛЬКО ЧАСТЬ|ЧАСТЬ/i);
  const transition = metaBrief(new Date('2026-11-01T15:00:00Z'));
  assert.doesNotMatch(transition, /Sweeper Shotgun/);
  assert.match(transition, /новый BR-сезон/);
  const expired = metaBrief(new Date('2026-11-03T00:00:00Z'));
  assert.match(expired, /устарела/);
  assert.doesNotMatch(expired, /Sweeper Shotgun/);
});

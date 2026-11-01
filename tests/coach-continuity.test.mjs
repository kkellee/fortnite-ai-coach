import test from 'node:test';
import assert from 'node:assert/strict';
import { coachContext } from '../dist/coach-continuity.mjs';
import { buildAdviceRequest } from '../dist/case-advice.mjs';
import { profileReviewRequest } from '../dist/player-context.mjs';

const profile = { nick: 'Player', mode: 'Battle Royale', team: 'Solo', build: 'Build', focus: 'Файты', minutes: 40 };
const episode = { id: 'one', focus: 'Файты', note: 'Проиграл первый обмен', action: 'Ждать тиммейта', outcome: 'После ожидания стало лучше', aiAdvice: 'Сначала проверь позицию', aiOutcomeAdvice: 'Продолжай ждать подтверждения' };

test('chat, case analysis and profile analysis share the current player plan and earlier advice', () => {
  const state = { profile, stats: { pr: 1200 }, activeCase: 'one', cases: [episode], profileReview: { text: 'Проверь первый обмен' }, aiMessages: [{ role: 'user', text: 'Я попробовал ждать', status: 'complete' }, { role: 'assistant', text: 'Запиши результат', status: 'complete' }] };
  const chat = JSON.parse(coachContext(state, episode));
  const analysis = JSON.parse(buildAdviceRequest(episode, profile, null, true, state.stats, state.aiMessages, state).context);
  const review = JSON.parse(profileReviewRequest(state).context);
  for (const context of [chat, analysis, review]) {
    assert.equal(context.episode.playerPlan, 'Ждать тиммейта');
    assert.equal(context.episode.playerOutcome, 'После ожидания стало лучше');
    assert.ok(context.continuity.priorAIUnverified.includes('Сначала проверь позицию'));
    assert.equal(context.player.playerEnteredStats.powerRanking, 1200);
  }
  assert.ok(coachContext(state, episode).length <= 1600);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { playerContext, profileFindings, profileReviewRequest } from '../dist/player-context.mjs';
import { buildAdviceRequest } from '../dist/case-advice.mjs';
import { freshState, parseState } from '../dist/engine.mjs';

const profile = { nick:'Player', mode:'Battle Royale', team:'Trio', build:'Build', role:'IGL', focus:'Файты', minutes:40, tracker:'https://fortnitetracker.com/fortnite/profile/x' };
test('profile numbers are available to both chat and episode feedback with honest provenance', () => {
  const state = { ...freshState(), profile, stats:{pr:1200,earnings:50,events:4,matches:20,early:6,topTen:8,eliminations:37,period:'FNCS Trio',notes:'Changed team'} };
  const context = playerContext(state);
  assert.match(context,/1200/);
  assert.match(context,/FNCS Trio/);
  assert.match(context,/не сверены/);
  assert.doesNotMatch(context,/fortnitetracker\.com/);
  assert.match(buildAdviceRequest({note:'Проиграли первый файт',answers:[]},profile,null,false,state.stats).context,/1200/);
  assert.match(profileReviewRequest(state).context,/1200/);
});

test('profile ratios only use complete comparable inputs and survive backup', () => {
  assert.match(profileFindings({matches:20,early:6})[0].title,/30%/);
  assert.match(profileFindings({pr:1200})[0].title,/Пока нет/);
  const restored = parseState({...freshState(),profile,stats:{matches:20,early:6,period:'FNCS',notes:'Trio',updated:'2026-11-01'},profileReview:{text:'Проверь раннюю игру',fingerprint:'old',date:'2026-11-01'}});
  assert.equal(restored.stats.early,6);
  assert.equal(restored.profileReview.text,'Проверь раннюю игру');
});

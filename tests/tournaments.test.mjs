import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanTournaments, tournamentStats, tournamentReviewRequest } from '../dist/tournaments.mjs';
import { freshState, parseState } from '../dist/engine.mjs';

const profile = { nick:'Player', mode:'Battle Royale', team:'Solo', build:'Build', role:'IGL', focus:'Файты', minutes:40 };
const example = id => ({ id, date:'2026-11-01', name:`Cup ${id}`, format:'Solo', teammates:'', note:'Проверял первые файты', matches:[{placement:12,kills:2,points:42,damage:600,teamDamage:null},{placement:4,kills:4,points:75,damage:900,teamDamage:null}], screenshots:[] });

test('tournament totals use each match and retain records through backup', () => {
  const [t] = cleanTournaments([example('one')]);
  assert.deepEqual(tournamentStats(t), { games:2, points:117, kills:6, avgPoints:59, avgKills:3, topTen:1, avgPlacement:8, bestPlacement:4, damage:1500, damageGames:2 });
  const restored = parseState({ ...freshState(), profile, tournaments:[t] });
  assert.equal(restored.tournaments[0].matches[1].points, 75);
});

test('review is unlocked at three complete tournaments and includes all matches', () => {
  assert.throws(() => tournamentReviewRequest([example('one'),example('two')], profile));
  const payload = tournamentReviewRequest([example('one'),example('two'),example('three')], profile);
  const parsed = JSON.parse(payload.context);
  assert.equal(parsed.tournaments.length, 3);
  assert.equal(parsed.tournaments[0].matches.length, 2);
  assert.equal(payload.analysisType, 'tournaments');
  assert.ok(payload.context.length < 12000);
});

test('invalid imported matches cannot become complete tournaments', () => {
  assert.equal(cleanTournaments([{ ...example('bad'), matches:[{placement:0,kills:2,points:40}] }]).length,0);
});

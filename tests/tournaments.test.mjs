import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanTournaments, tournamentStats, tournamentReviewRequest } from '../dist/tournaments.mjs';
import { freshState, parseState } from '../dist/engine.mjs';
import { parseReadout } from '../dist/tournament-readout.mjs';

const profile = { nick:'Player', mode:'Battle Royale', team:'Solo', build:'Build', role:'IGL', focus:'Файты', minutes:40 };
const example = id => ({ id, date:'2026-11-01', name:`Cup ${id}`, format:'Solo', teammates:'', note:'Проверял первые файты', matches:[{placement:12,kills:2,points:42,damage:600,teamDamage:null},{placement:4,kills:4,points:75,damage:900,teamDamage:null}], screenshots:[] });
const withShots = id => ({...example(id),matches:[],screenshots:[{id:`tracker-${id}`,kind:'tracker',name:'tracker.png'},{id:`osirion-${id}`,kind:'damage',name:'osirion.png'}]});

test('tournament totals use each match and retain records through backup', () => {
  const [t] = cleanTournaments([example('one')]);
  assert.deepEqual(tournamentStats(t), { games:2, points:117, kills:6, avgPoints:59, avgKills:3, topTen:1, avgPlacement:8, bestPlacement:4, damage:1500, damageGames:2 });
  const restored = parseState({ ...freshState(), profile, tournaments:[t] });
  assert.equal(restored.tournaments[0].matches[1].points, 75);
});

test('review is unlocked at three complete tournaments and includes all matches', () => {
  assert.throws(() => tournamentReviewRequest([example('one'),example('two')], profile));
  assert.throws(() => tournamentReviewRequest([example('one'),example('two'),example('three')], profile));
  const payload = tournamentReviewRequest([withShots('one'),withShots('two'),withShots('three')], profile);
  const parsed = JSON.parse(payload.context);
  assert.equal(parsed.tournaments.length, 3);
  assert.equal(parsed.tournaments[0].matches.length, 0);
  assert.equal(payload.analysisType, 'tournaments');
  assert.ok(payload.context.length < 12000);
});

test('screenshot tournaments are valid without manually entered games',()=>{
 assert.equal(cleanTournaments([withShots('one')]).length,1);
 assert.equal(cleanTournaments([{...withShots('one'),screenshots:[]}]).length,0);
});
test('readable screenshot results can be corrected and survive backup without invented numbers',()=>{
  const readout=parseReadout('```json\n{"games":[{"placement":5,"kills":2,"points":60,"damage":null,"teamDamage":900},{"placement":"?","kills":1}],"note":"Урон первой игры не виден"}\n```');
  assert.equal(readout.games[0].damage,null);
  assert.equal(readout.games[1].placement,null);
  readout.games[1].placement=8;
  const restored=parseState({...freshState(),profile,tournaments:[{...withShots('one'),readout}]});
  assert.equal(restored.tournaments[0].readout.games[1].placement,8);
  assert.equal(restored.tournaments[0].readout.games[0].damage,null);
});


test('invalid imported matches cannot become complete tournaments', () => {
  assert.equal(cleanTournaments([{ ...example('bad'), matches:[{placement:0,kills:2,points:40}] }]).length,0);
});

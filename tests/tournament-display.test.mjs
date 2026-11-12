import test from 'node:test';
import assert from 'node:assert/strict';
import { tournamentCard } from '../dist/tournament-journal.mjs';

test('tracker results become a readable summary while missing numbers stay unknown', () => {
  const html = tournamentCard({
    id:'one', name:'Solo Cash Cup', date:'2026-11-10', mode:'Battle Royale', build:'Build', format:'Solo',
    teammates:'', matches:[], screenshots:[], note:'',
    readout:{ note:'', games:[
      { placement:12, kills:3, points:40, damage:900, teamDamage:null },
      { placement:null, kills:null, points:null, damage:null, teamDamage:null }
    ] }
  });
  assert.match(html, /Твой турнир в цифрах/);
  assert.match(html, /<strong>40<\/strong><small>из 1 игры/);
  assert.match(html, /Место не прочитано/);
  assert.match(html, /Исправить неверно считанные цифры/);
  assert.doesNotMatch(html, /<strong>0<\/strong><small>из 0 игр/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardInsight } from '../dist/dashboard-insight.mjs';

const tournament = (id, points) => ({id,date:'2026-11-01',name:`Cup ${id}`,matches:[{placement:5,kills:2,points}],screenshots:[{kind:'tracker'},{kind:'damage'}]});

test('dashboard points to first review and computes only entered match totals', () => {
  const empty = dashboardInsight({tournaments:[]});
  assert.match(empty,/0<small> \/ 3 турнира/);
  assert.doesNotMatch(empty,/очков/);
  const ready = dashboardInsight({tournaments:[tournament('a',20),tournament('b',30),tournament('c',40)]});
  assert.match(ready,/3 матчей · 90 очков · 6 устранений по старым записям/);
  assert.match(ready,/Получить персональный разбор/);
});

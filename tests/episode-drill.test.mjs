import test from 'node:test';
import assert from 'node:assert/strict';
import {episodeDrill} from '../dist/episode-drill.mjs';

test('late game episode suggests late game practice, not an unrelated zone route',()=>{
 const drill=episodeDrill('Я умер в лейте уже с ХГ');
 assert.match(drill.title,/поздней стадии/);
 assert.match(drill.action,/укрытия/);
 assert.doesNotMatch(drill.action,/ротацией/);
});

test('zone episode suggests route practice and unclear episode stays generic',()=>{
 assert.match(episodeDrill('Не успел зайти в следующую зону').title,/маршрута/);
 assert.match(episodeDrill('Что-то пошло не так').title,/уточни эпизод/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {episodeDrill} from '../dist/episode-drill.mjs';

test('late game episode suggests late game practice, not an unrelated zone route',()=>{
 const drill=episodeDrill('Я умер в лейте уже с ХГ');
 assert.match(drill.title,/как потерял ХГ/);
 assert.match(drill.action,/сбили|сорвался/);
 assert.doesNotMatch(drill.action,/ротацией/);
});

test('high ground drills change with the stated cause without guessing it',()=>{
 assert.match(episodeDrill('Умер в лейте с ХГ','Соперник сбил мою опору и я упал вниз').title,/удерживал ХГ/);
 assert.match(episodeDrill('Умер в лейте с ХГ','Я прыгнул вниз и разбился при спуске').title,/спуска с ХГ/);
});

test('zone episode suggests route practice and unclear episode stays generic',()=>{
 assert.match(episodeDrill('Не успел зайти в следующую зону').title,/маршрута/);
 assert.match(episodeDrill('Что-то пошло не так').title,/уточни эпизод/);
});

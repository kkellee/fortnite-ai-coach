import { dayKey } from './engine.mjs';
import { cleanTournaments, tournamentStats, tournamentReviewRequest } from './tournaments.mjs';
import { getFile, putFile, deleteFile } from './evidence.mjs';
import { AI_ENDPOINT } from './ai-config.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
let api, tab = 'notes', editingId = null, pending = false, error = '';
const fingerprint = tournaments => {
  const text = JSON.stringify(tournaments.slice(0,3).map(t => ({id:t.id,mode:t.mode,build:t.build,matches:t.matches,screenshots:t.screenshots})));
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16);
};
async function compactImage(file) {
  const bitmap = await createImageBitmap(file), canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
  try {
    let scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
    for (let i = 0; i < 7; i++) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      const data = canvas.toDataURL('image/jpeg', .78);
      if (data.length <= 360000) return data;
      scale *= .78;
    }
    throw Error('Скриншот слишком большой. Обрежь его до нужной статистики.');
  } finally { bitmap.close(); }
}
const refresh = () => { if (location.hash === '#journal') api.render(); };
const matchRow = (match = {}, index = 0) => `<div class="tj-match-row" data-match-row><strong>Игра <span class="tj-match-number">${index + 1}</span></strong><label>Место<input name="placement" type="number" min="1" max="10000" value="${esc(match.placement ?? '')}" required></label><label>Устранения<input name="kills" type="number" min="0" max="100" value="${esc(match.kills ?? '')}" required></label><label>Очки<input name="points" type="number" min="0" max="10000" value="${esc(match.points ?? '')}" required></label><label>Твой урон<input name="damage" type="number" min="0" max="100000" value="${esc(match.damage ?? '')}" placeholder="если знаешь"></label><label>Урон команды<input name="teamDamage" type="number" min="0" max="100000" value="${esc(match.teamDamage ?? '')}" placeholder="если знаешь"></label><button type="button" data-remove-match aria-label="Удалить игру">×</button></div>`;

function notesView(state) {
  const all = (state.sessions || []).map((item,index) => ({ item,index }));
  const notes = all.filter(({item}) => ['Полезная информация','Ошибка / вывод'].includes(item.type));
  const legacy = all.filter(({item}) => !['Полезная информация','Ошибка / вывод'].includes(item.type));
  const pinned = all.filter(({item}) => item.pinned);
  const entry = ({item,index}) => `<article class="tj-note"><div><small>${esc(item.date)}${legacy.some(x => x.index === index) ? ` · старая запись: ${esc(item.type)}` : ''}</small><p>${esc(item.note)}</p></div><div class="tj-actions"><button type="button" data-tj-pin="${index}">${item.pinned ? '★ В памятке' : '☆ В памятку'}</button><button type="button" data-tj-delete-note="${index}">Удалить</button></div></article>`;
  return `<section class="tj-notes"><div class="tj-note-grid"><section class="tj-memo"><span class="eyebrow">ПЕРЕД ИГРОЙ</span><h2>Твоя памятка</h2><p>Здесь только записи, которые ты закрепил сам.</p>${pinned.length ? pinned.map(({item}) => `<p class="tj-memo-line">★ ${esc(item.note)}</p>`).join('') : '<p class="tj-empty">Пока ничего не закреплено.</p>'}</section><form class="card tj-form" id="tj-note-form"><span class="eyebrow">ПОЛЕЗНАЯ ИНФОРМАЦИЯ</span><h2>Записать мысль</h2><label>Что хочешь помнить?<textarea name="note" maxlength="3000" required placeholder="Например: перед первым файтом проверить позицию команды и доступный лут."></textarea></label><label class="tj-check"><input type="checkbox" name="pinned" value="yes"> Добавить в памятку</label><button class="btn" type="submit">Сохранить заметку</button></form></div><section class="tj-list"><h2>Полезная информация <small>${notes.length}</small></h2>${notes.length ? notes.map(entry).join('') : '<p class="tj-empty">Пока нет заметок. Запиши одну полезную мысль, к которой захочешь вернуться.</p>'}${legacy.length ? `<details class="tj-legacy"><summary>Старые записи (${legacy.length})</summary><p>Записи из прежней версии сохранены без изменений.</p>${legacy.map(entry).join('')}</details>` : ''}</section></section>`;
}
function tournamentCard(t) {
  const stats = tournamentStats(t);
  const cells = t.matches.map((m,i) => `<tr><td>${i+1}</td><td>${m.placement}</td><td>${m.kills}</td><td>${m.points}</td><td>${m.damage ?? '—'}</td><td>${m.teamDamage ?? '—'}</td></tr>`).join('');
  const shot = kind => { const s=t.screenshots?.find(x => x.kind === kind); return `<div class="tj-evidence"><strong>${kind === 'tracker' ? 'Fortnite Tracker' : 'Урон / Osirion'}</strong>${s ? `<span>${esc(s.name)}</span><button type="button" data-tj-open="${esc(s.id)}">Открыть</button><button type="button" data-tj-remove-shot="${esc(t.id)}" data-kind="${kind}">Удалить</button>` : `<label class="tj-upload">Прикрепить скриншот<input type="file" data-tj-upload="${esc(t.id)}" data-kind="${kind}" accept="image/png,image/jpeg,image/webp"></label>`}</div>`; };
  return `<article class="card tj-tournament"><div class="tj-card-head"><div><small>${esc(t.date)} · ${esc([t.mode,t.build,t.format].filter(Boolean).join(' · ') || 'Формат не указан')}</small><h3>${esc(t.name)}</h3>${t.teammates ? `<p>Состав: ${esc(t.teammates)}</p>` : ''}</div><div class="tj-actions"><button type="button" data-tj-edit="${esc(t.id)}">Изменить</button><button type="button" data-tj-delete="${esc(t.id)}">Удалить</button></div></div><div class="tj-metrics"><span><strong>${stats.games}</strong> игр</span><span><strong>${stats.points}</strong> очков</span><span><strong>${stats.kills}</strong> устранений</span><span><strong>${stats.avgPlacement ?? '—'}</strong> среднее место</span><span><strong>${stats.bestPlacement ?? '—'}</strong> лучшее место</span><span><strong>${stats.avgPoints ?? '—'}</strong> очков за игру</span><span><strong>${stats.avgKills ?? '—'}</strong> устранений за игру</span><span><strong>${stats.topTen}</strong> топ-10</span>${stats.damage !== null ? `<span><strong>${stats.damage}</strong> урона в ${stats.damageGames} играх</span>` : ''}</div><details><summary>Посмотреть все игры и скриншоты</summary><div class="tj-table-wrap"><table><thead><tr><th>Игра</th><th>Место</th><th>Устр.</th><th>Очки</th><th>Твой урон</th><th>Урон команды</th></tr></thead><tbody>${cells}</tbody></table></div>${t.note ? `<p class="tj-note-text">${esc(t.note)}</p>` : ''}<div class="tj-evidence-grid">${shot('tracker')}${shot('damage')}</div><p class="fine">Скриншоты хранятся в этом браузере. При AI-разборе трёх турниров приложенные скриншоты отправятся модели вместе с введёнными числами. Каждый скриншот можно удалить.</p></details></article>`;
}

function tournamentForm(state) {
  const t = state.tournaments?.find(item => item.id === editingId);
  const suggestions = [...new Set(['FNCS','Solo Cash Cup','Duo Cash Cup','Trio Cash Cup','Victory Cup',...(state.tournaments || []).map(x => x.name)])].map(x => `<option value="${esc(x)}"></option>`).join('');
  return `<form class="card tj-form" id="tj-tournament-form"><div class="tj-form-head"><div><span class="eyebrow">${t ? 'ИЗМЕНИТЬ ТУРНИР' : 'НОВЫЙ ТУРНИР'}</span><h2>${t ? esc(t.name) : 'Запиши прошедший турнир'}</h2></div>${t ? '<button type="button" data-tj-cancel>Отмена</button>' : ''}</div><p>Выбери название из подсказок или напиши своё. Подсказки — названия серий, а не проверенный календарь прошедших событий. <a href="https://www.fortnite.com/competitive/schedule" target="_blank" rel="noopener noreferrer">Сверить название и дату с официальным расписанием ↗</a></p><div class="tj-fields"><label>Название турнира<input name="name" list="tj-names" maxlength="100" value="${esc(t?.name || '')}" placeholder="Например, Solo Cash Cup" required><datalist id="tj-names">${suggestions}</datalist></label><label>Дата<input name="date" type="date" max="${dayKey()}" value="${esc(t?.date || dayKey())}" required></label><label>Режим<select name="mode"><option value="">Выбери режим</option>${['Battle Royale','Reload'].map(x => `<option value="${x}" ${t?.mode === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label>Строительство<select name="build"><option value="">Выбери</option>${['Build','Zero Build'].map(x => `<option value="${x}" ${t?.build === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label>Формат<select name="format"><option ${!t?.format?'selected':''} value="">Выбери формат</option>${['Solo','Duo','Trio','Squad'].map(x => `<option value="${x}" ${t?.format === x?'selected':''}>${x}</option>`).join('')}</select></label><label>С кем играл<input name="teammates" maxlength="120" value="${esc(t?.teammates || '')}" placeholder="Ники команды или «Solo»"></label></div><h3>Игры турнира</h3><p>Впиши место, устранения и очки каждой игры. Урон можно добавить, если он есть в статистике.</p><div id="tj-match-rows">${(t?.matches?.length ? t.matches : [{},{},{}]).map(matchRow).join('')}</div><button type="button" class="btn secondary small" data-tj-add-match>＋ Добавить игру</button><label class="tj-full">Что ещё важно про этот турнир?<textarea name="note" maxlength="500" placeholder="Например: поменяли состав, играли с новой локи, одна игра не засчиталась.">${esc(t?.note || '')}</textarea></label><p id="tj-form-error" class="error" role="alert"></p><button class="btn" type="submit">${t ? 'Сохранить изменения' : 'Сохранить турнир'} →</button></form>`;
}

function tournamentsView(state) {
  const tournaments = state.tournaments || [], ready = tournaments.length >= 3;
  const latest = fingerprint(tournaments), review = state.tournamentReview, current = review?.fingerprint === latest;
  return `<section class="tj-tournaments"><div class="tj-review"><span class="eyebrow">ПОСЛЕ ТРЁХ ТУРНИРОВ</span><h2>${ready ? 'Пора увидеть закономерности' : `До первого AI-разбора: ${3 - tournaments.length} ${3 - tournaments.length === 1 ? 'турнир' : 'турнира'}`}</h2><p>Заполни матчи трёх прошедших турниров. Сайт посчитает итоги бесплатно; AI затем сравнит результаты и предложит первый шаг для работы над игрой. Когда запросишь AI-разбор, результаты и приложенные скриншоты отправятся на сервер для анализа. Скриншоты могут увеличить расход лимита.</p>${ready ? `<button class="btn" type="button" data-tj-review ${pending ? 'disabled' : ''}>${pending ? 'Тренер анализирует…' : current ? 'Обновить AI-разбор' : 'Получить AI-разбор трёх турниров'} →</button>` : ''}${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}${review ? `<div class="tj-review-text"><small>${current ? 'ПО ТЕКУЩИМ ДАННЫМ' : 'УСТАРЕЛ: ДАННЫЕ ИЗМЕНИЛИСЬ'} · ${esc(review.date)}</small><p>${esc(review.text)}</p><a href="#plan">Перейти к работе над игрой →</a></div>` : ''}</div><div class="tj-tournament-layout"><div class="tj-tournament-list"><h2>Мои турниры <small>${tournaments.length}</small></h2>${tournaments.length ? tournaments.map(tournamentCard).join('') : '<div class="tj-empty">Пока нет турниров. Добавь один прошедший турнир и результаты его матчей.</div>'}</div>${tournamentForm(state)}</div></section>`;
}

export function renderTournamentJournal(state) {
  return `<div class="tj-page"><header class="tj-heading"><span class="eyebrow">ТВОЯ ИСТОРИЯ ИГРЫ</span><h1>Заметки и турниры</h1><p>Храни полезные мысли и результаты матчей в одном месте. Через три турнира получи разбор по своим данным.</p></header><nav class="tj-tabs" aria-label="Разделы журнала"><button type="button" data-tj-tab="notes" class="${tab === 'notes' ? 'active' : ''}" aria-pressed="${tab === 'notes'}">Полезная информация</button><button type="button" data-tj-tab="tournaments" class="${tab === 'tournaments' ? 'active' : ''}" aria-pressed="${tab === 'tournaments'}">Турниры <span>${state.tournaments?.length || 0}</span></button></nav>${tab === 'notes' ? notesView(state) : tournamentsView(state)}</div>`;
}

export function installTournamentJournal(options) {
  api = options;
  document.addEventListener('click', async event => {
    const b = event.target.closest('button'); if (!b) return;
    const s = api.getState();
    if (b.dataset.tjTab) { tab = b.dataset.tjTab; editingId = null; refresh(); return; }
    if (b.hasAttribute('data-tj-add-match')) { const rows = document.querySelector('#tj-match-rows'); if (rows?.children.length >= 20) return api.toast('В одном турнире можно записать до 20 игр.'); rows?.insertAdjacentHTML('beforeend', matchRow({}, rows.children.length)); return; }
    if (b.hasAttribute('data-remove-match')) { const rows = document.querySelector('#tj-match-rows'); if (rows?.children.length <= 1) return; b.closest('[data-match-row]')?.remove(); [...rows.children].forEach((row,i) => row.querySelector('.tj-match-number').textContent = i+1); return; }
    if (b.dataset.tjEdit) { editingId = b.dataset.tjEdit; tab = 'tournaments'; refresh(); document.querySelector('#tj-tournament-form')?.scrollIntoView({ behavior:'smooth' }); return; }
    if (b.hasAttribute('data-tj-cancel')) { editingId = null; refresh(); return; }
    if (b.dataset.tjDelete && confirm('Удалить этот турнир и его скриншоты?')) { const t = s.tournaments.find(x => x.id === b.dataset.tjDelete); if (!t) return; s.tournaments = s.tournaments.filter(x => x.id !== t.id); s.tournamentReview = null; if (editingId === t.id) editingId = null; if (api.save()) { refresh(); for (const shot of t.screenshots || []) try { await deleteFile(shot.id); } catch {} } return; }
    if (b.dataset.tjDeleteNote !== undefined && confirm('Удалить заметку?')) { s.sessions.splice(Number(b.dataset.tjDeleteNote),1); if (api.save()) refresh(); return; }
    if (b.dataset.tjPin !== undefined) { const note = s.sessions[Number(b.dataset.tjPin)]; if (note) { note.pinned = !note.pinned; if (api.save()) refresh(); } return; }
    if (b.dataset.tjOpen) { try { const row = await getFile(b.dataset.tjOpen); if (!row?.file) throw Error(); const url = URL.createObjectURL(row.file), link = document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000); } catch { api.toast('Скриншот не найден в этом браузере.'); } return; }
    if (b.dataset.tjRemoveShot) { const t = s.tournaments.find(x => x.id === b.dataset.tjRemoveShot), shot = t?.screenshots?.find(x => x.kind === b.dataset.kind); if (!shot) return; t.screenshots = t.screenshots.filter(x => x !== shot); s.tournamentReview = null; if (api.save()) { refresh(); try { await deleteFile(shot.id); } catch {} } return; }
    if (b.hasAttribute('data-tj-review') && !pending) {
      pending = true; error = ''; refresh();
      try {
        const payload = tournamentReviewRequest(s.tournaments, s.profile);
        const images = [];
        for (const t of s.tournaments.slice(0, 3)) for (const shot of t.screenshots || []) {
          const row = await getFile(shot.id);
          if (!row?.file) throw Error(`Скриншот ${shot.name} не найден в этом браузере. Удали его и прикрепи заново.`);
          images.push({ tournamentId: t.id, kind: shot.kind, data: await compactImage(row.file) });
        }
        payload.images = images;
        const response = await fetch(AI_ENDPOINT + '/analysis', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(payload) });
        const data = await response.json();
        if (!response.ok || !data.answer) throw Error(data.error === 'player_daily_limit' ? 'Дневной лимит AI-разборов исчерпан. Попробуй завтра.' : 'AI сейчас недоступен. Попробуй позже.');
        s.tournamentReview = { text:String(data.answer).slice(0,8000), fingerprint:fingerprint(s.tournaments), date:dayKey() };
        if (!api.save()) throw Error('Не удалось сохранить разбор.');
      } catch (cause) { error = cause.message || 'Не удалось получить разбор.'; }
      finally { pending = false; refresh(); }
      return;
    }
  });
  document.addEventListener('change', async event => {
    const input = event.target; if (!input.dataset.tjUpload || !input.files?.[0]) return;
    const file = input.files[0], s = api.getState(), t = s.tournaments.find(x => x.id === input.dataset.tjUpload);
    if (!t) return;
    if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 5_000_000) { api.toast('Нужен PNG, JPG или WebP до 5 МБ.'); return; }
    const id = crypto.randomUUID(), old = t.screenshots?.find(x => x.kind === input.dataset.kind);
    try { await putFile(id,file); t.screenshots = [...(t.screenshots || []).filter(x => x.kind !== input.dataset.kind), { id, kind:input.dataset.kind, name:file.name.slice(0,100) }]; s.tournamentReview = null; if (!api.save()) throw Error(); refresh(); if (old) await deleteFile(old.id); api.toast('Скриншот сохранён на этом устройстве.'); } catch { try { await deleteFile(id); } catch {} api.toast('Не удалось сохранить скриншот.'); }
  });
  document.addEventListener('submit', event => {
    if (!['tj-note-form','tj-tournament-form'].includes(event.target.id)) return;
    event.preventDefault(); const s = api.getState(), form = event.target, data = new FormData(form);
    if (form.id === 'tj-note-form') { const note = String(data.get('note') || '').trim(); if (!note) return; s.sessions.unshift({ date:dayKey(), type:'Полезная информация', note:note.slice(0,3000), matches:0, early:0, pinned:data.get('pinned') === 'yes' }); s.sessions = s.sessions.slice(0,365); if (api.save()) { refresh(); api.toast('Заметка сохранена.'); } return; }
    const matches = [...form.querySelectorAll('[data-match-row]')].map(row => Object.fromEntries(['placement','kills','points','damage','teamDamage'].map(key => [key, row.querySelector(`[name="${key}"]`).value])));
    const raw = { id:editingId || crypto.randomUUID(), name:data.get('name'), date:data.get('date'), mode:data.get('mode'), build:data.get('build'), format:data.get('format'), teammates:data.get('teammates'), note:data.get('note'), matches, screenshots:s.tournaments?.find(x => x.id === editingId)?.screenshots || [] };
    const clean = cleanTournaments([raw])[0];
    if (!clean || clean.matches.length !== matches.length || clean.date > dayKey()) { form.querySelector('#tj-form-error').textContent = 'Проверь дату и числа каждой игры: место от 1, устранения и очки от 0.'; return; }
    s.tournaments ||= []; s.tournaments = [clean, ...s.tournaments.filter(x => x.id !== editingId)].sort((a,b) => b.date.localeCompare(a.date)).slice(0,60); s.tournamentReview = null; editingId = null;
    if (api.save()) { refresh(); api.toast('Турнир сохранён. Итоги посчитаны автоматически.'); }
  });
}

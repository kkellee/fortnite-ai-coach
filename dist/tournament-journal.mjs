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
  const shot = kind => { const s=t.screenshots?.find(x => x.kind === kind); return `<div class="tj-evidence"><strong>${kind === 'tracker' ? 'Fortnite Tracker' : 'Урон / Osirion'}</strong>${s ? `<span>${esc(s.name)}</span><button type="button" data-tj-open="${esc(s.id)}">Открыть</button><button type="button" data-tj-edit="${esc(t.id)}">Заменить</button>` : `<label class="tj-upload">Прикрепить скриншот<input type="file" data-tj-upload="${esc(t.id)}" data-kind="${kind}" accept="image/png,image/jpeg,image/webp"></label>`}</div>`; };
  return `<article class="card tj-tournament"><div class="tj-card-head"><div><small>${esc(t.date)} · ${esc([t.mode,t.build,t.format].filter(Boolean).join(' · ') || 'Формат не указан')}</small><h3>${esc(t.name)}</h3>${t.teammates ? `<p>Состав: ${esc(t.teammates)}</p>` : ''}</div><div class="tj-actions"><button type="button" data-tj-edit="${esc(t.id)}">Изменить</button><button type="button" data-tj-delete="${esc(t.id)}">Удалить</button></div></div>${t.matches.length ? `<div class="tj-metrics"><span><strong>${stats.games}</strong> игр по старым записям</span><span><strong>${stats.points}</strong> очков</span><span><strong>${stats.kills}</strong> устранений</span></div>` : '<p>Результаты игр будут прочитаны со скриншотов при AI-разборе. Если снимок нечёткий, тренер укажет это.</p>'}${t.note ? `<p class="tj-note-text">${esc(t.note)}</p>` : ''}<div class="tj-evidence-grid">${shot('tracker')}${shot('damage')}</div><p class="fine">Скриншоты хранятся в этом браузере и отправляются модели только при запросе AI-разбора.</p></article>`;
}

function tournamentForm(state) {
  const t = state.tournaments?.find(item => item.id === editingId);
  const suggestions = [...new Set(['FNCS','Solo Cash Cup','Duo Cash Cup','Trio Cash Cup','Victory Cup',...(state.tournaments || []).map(x => x.name)])].map(x => `<option value="${esc(x)}"></option>`).join('');
  return `<form class="card tj-form" id="tj-tournament-form"><div class="tj-form-head"><div><span class="eyebrow">${t ? 'ИЗМЕНИТЬ ТУРНИР' : 'НОВЫЙ ТУРНИР'}</span><h2>${t ? esc(t.name) : 'Запиши прошедший турнир'}</h2></div>${t ? '<button type="button" data-tj-cancel>Отмена</button>' : ''}</div><p>Выбери название из подсказок или напиши своё. Подсказки — названия серий, а не проверенный календарь прошедших событий. <a href="https://www.fortnite.com/competitive/schedule" target="_blank" rel="noopener noreferrer">Сверить название и дату с официальным расписанием ↗</a></p><div class="tj-fields"><label>Название турнира<input name="name" list="tj-names" maxlength="100" value="${esc(t?.name || '')}" placeholder="Например, Solo Cash Cup" required><datalist id="tj-names">${suggestions}</datalist></label><label>Дата<input name="date" type="date" max="${dayKey()}" value="${esc(t?.date || dayKey())}" required></label><label>Режим<select name="mode"><option value="">Выбери режим</option>${['Battle Royale','Reload'].map(x => `<option value="${x}" ${t?.mode === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label>Строительство<select name="build"><option value="">Выбери</option>${['Build','Zero Build'].map(x => `<option value="${x}" ${t?.build === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label>Формат<select name="format"><option ${!t?.format?'selected':''} value="">Выбери формат</option>${['Solo','Duo','Trio','Squad'].map(x => `<option value="${x}" ${t?.format === x?'selected':''}>${x}</option>`).join('')}</select></label><label>С кем играл<input name="teammates" maxlength="120" value="${esc(t?.teammates || '')}" placeholder="Ники команды или «Solo»"></label></div><h3>Скриншоты результатов</h3><p>Нужны два читаемых снимка этого турнира: результаты игр из Fortnite Tracker и урон из Osirion.</p><div class="tj-evidence-grid"><label>Fortnite Tracker<input name="trackerShot" type="file" accept="image/png,image/jpeg,image/webp" ${t?.screenshots?.some(x=>x.kind==='tracker')?'':'required'}></label><label>Osirion<input name="damageShot" type="file" accept="image/png,image/jpeg,image/webp" ${t?.screenshots?.some(x=>x.kind==='damage')?'':'required'}></label></div>${t?'<p>Новые снимки заменят прикреплённые ранее.</p>':''}<label class="tj-full">Что ещё важно про этот турнир?<textarea name="note" maxlength="500" placeholder="Например: поменяли состав, играли с новой локи, одна игра не засчиталась.">${esc(t?.note || '')}</textarea></label><p id="tj-form-error" class="error" role="alert"></p><button class="btn" type="submit">${t ? 'Сохранить изменения' : 'Сохранить турнир'} →</button></form>`;
}

function tournamentsView(state) {
  const tournaments = state.tournaments || [], ready = tournaments.slice(0,3).length === 3 && tournaments.slice(0,3).every(t => ['tracker','damage'].every(kind => t.screenshots?.some(x => x.kind === kind)));
  const latest = fingerprint(tournaments), review = state.tournamentReview, current = review?.fingerprint === latest;
  return `<section class="tj-tournaments"><div class="tj-review"><span class="eyebrow">ПОСЛЕ ТРЁХ ТУРНИРОВ</span><h2>${ready ? 'Пора увидеть закономерности' : tournaments.length >= 3 ? 'Прикрепи недостающие скриншоты' : `До первого AI-разбора: ${3 - tournaments.length} ${3 - tournaments.length === 1 ? 'турнир' : 'турнира'}`}</h2><p>Прикрепи к каждому из трёх прошедших турниров результаты из Fortnite Tracker и Osirion. AI прочитает видимые игры, если снимки достаточно чёткие. Когда запросишь AI-разбор, результаты и приложенные скриншоты отправятся на сервер для анализа. Скриншоты могут увеличить расход лимита.</p>${ready ? `<button class="btn" type="button" data-tj-review ${pending ? 'disabled' : ''}>${pending ? 'Тренер анализирует…' : current ? 'Обновить AI-разбор' : 'Получить AI-разбор трёх турниров'} →</button>` : ''}${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}${review ? `<div class="tj-review-text"><small>${current ? 'ПО ТЕКУЩИМ ДАННЫМ' : 'УСТАРЕЛ: ДАННЫЕ ИЗМЕНИЛИСЬ'} · ${esc(review.date)}</small><p>${esc(review.text)}</p><a href="#plan">Перейти к работе над игрой →</a></div>` : ''}</div><div class="tj-tournament-layout"><div class="tj-tournament-list"><h2>Мои турниры <small>${tournaments.length}</small></h2>${tournaments.length ? tournaments.map(tournamentCard).join('') : '<div class="tj-empty">Пока нет турниров. Добавь прошедший турнир и два скриншота результатов.</div>'}</div>${tournamentForm(state)}</div></section>`;
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
    if (b.dataset.tjEdit) { editingId = b.dataset.tjEdit; tab = 'tournaments'; refresh(); document.querySelector('#tj-tournament-form')?.scrollIntoView({ behavior:'smooth' }); return; }
    if (b.hasAttribute('data-tj-cancel')) { editingId = null; refresh(); return; }
    if (b.dataset.tjDelete && confirm('Удалить этот турнир и его скриншоты?')) { const t = s.tournaments.find(x => x.id === b.dataset.tjDelete); if (!t) return; s.tournaments = s.tournaments.filter(x => x.id !== t.id); s.tournamentReview = null; if (editingId === t.id) editingId = null; if (api.save()) { refresh(); for (const shot of t.screenshots || []) try { await deleteFile(shot.id); } catch {} } return; }
    if (b.dataset.tjDeleteNote !== undefined && confirm('Удалить заметку?')) { s.sessions.splice(Number(b.dataset.tjDeleteNote),1); if (api.save()) refresh(); return; }
    if (b.dataset.tjPin !== undefined) { const note = s.sessions[Number(b.dataset.tjPin)]; if (note) { note.pinned = !note.pinned; if (api.save()) refresh(); } return; }
    if (b.dataset.tjOpen) { try { const row = await getFile(b.dataset.tjOpen); if (!row?.file) throw Error(); const url = URL.createObjectURL(row.file), link = document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000); } catch { api.toast('Скриншот не найден в этом браузере.'); } return; }
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
        if (!response.ok || !data.answer) throw Error(data.error === 'player_daily_limit' ? 'Дневной лимит AI-разборов исчерпан. Попробуй завтра.' : data.error === 'image_provider_unavailable' ? 'AI-модель для чтения скриншотов сейчас не подключена на сервере.' : 'AI сейчас недоступен. Попробуй позже.');
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
  document.addEventListener('submit', async event => {
    if (!['tj-note-form','tj-tournament-form'].includes(event.target.id)) return;
    event.preventDefault(); const s = api.getState(), form = event.target, data = new FormData(form);
    if (form.id === 'tj-note-form') { const note = String(data.get('note') || '').trim(); if (!note) return; s.sessions.unshift({ date:dayKey(), type:'Полезная информация', note:note.slice(0,3000), matches:0, early:0, pinned:data.get('pinned') === 'yes' }); s.sessions = s.sessions.slice(0,365); if (api.save()) { refresh(); api.toast('Заметка сохранена.'); } return; }
    const old=s.tournaments?.find(x=>x.id===editingId), staged=[], screenshots=[...(old?.screenshots||[])];
    try {
      for(const [kind,key] of [['tracker','trackerShot'],['damage','damageShot']]){
        const file=data.get(key);
        if(file&&file.size){
          if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5_000_000)throw Error('Каждый снимок должен быть PNG, JPG или WebP до 5 МБ.');
          const id=crypto.randomUUID();await putFile(id,file);staged.push(id);
          const index=screenshots.findIndex(x=>x.kind===kind);if(index>=0)screenshots.splice(index,1);
          screenshots.push({id,kind,name:file.name.slice(0,100)});
        }
      }
      if(!['tracker','damage'].every(kind=>screenshots.some(x=>x.kind===kind)))throw Error('Прикрепи оба скриншота: Fortnite Tracker и Osirion.');
      const raw={id:editingId||crypto.randomUUID(),name:data.get('name'),date:data.get('date'),mode:data.get('mode'),build:data.get('build'),format:data.get('format'),teammates:data.get('teammates'),note:data.get('note'),matches:old?.matches||[],screenshots};
      const clean=cleanTournaments([raw])[0];if(!clean||clean.date>dayKey())throw Error('Проверь название и дату турнира.');
      s.tournaments||=[];const prior=s.tournaments,priorReview=s.tournamentReview;
      s.tournaments=[clean,...prior.filter(x=>x.id!==editingId)].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,60);s.tournamentReview=null;
      if(!api.save()){s.tournaments=prior;s.tournamentReview=priorReview;throw Error('Не удалось сохранить турнир.');}
      editingId=null;refresh();api.toast('Турнир и оба скриншота сохранены.');
      for(const shot of old?.screenshots||[])if(!screenshots.some(x=>x.id===shot.id))try{await deleteFile(shot.id);}catch{}
    }catch(cause){for(const id of staged)try{await deleteFile(id);}catch{};form.querySelector('#tj-form-error').textContent=cause.message||'Не удалось сохранить турнир.';}

  });
}

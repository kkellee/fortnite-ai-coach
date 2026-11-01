import { AI_ENDPOINT } from './ai-config.mjs';
import { profileFindings, profileReviewRequest, playerContext } from './player-context.mjs?v=20261101-profile';
import { dayKey } from './engine.mjs?v=20261101-profile';
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
const formatReview = value => esc(value).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
let api, pending = false, error = '';
const fields = [['matches','Турнирных матчей'],['early','Ранних вылетов'],['topTen','Попаданий в топ-10'],['eliminations','Устранений']];
export function renderProfilePanel(state) {
  const s = state.stats || {}, findings = profileFindings(s);
  const fingerprint = playerContext(state), review = state.profileReview;
  const stale = review && review.fingerprint !== fingerprint;
  return `<section class="card profile-panel"><span class="badge lime">ДАННЫЕ ДЛЯ ТРЕНЕРА</span><h2>Твоя турнирная картина</h2><p>Цифры из профиля автоматически идут в AI-чат и разбор эпизода. Укажи один период и один формат, чтобы сравнение имело смысл. Это введённые тобой данные, не выгрузка с трекера.</p>
  <form id="tournament-stats-form"><div class="form-grid"><div class="field"><label for="stat-period">Период и турнирный формат</label><input id="stat-period" name="period" maxlength="60" value="${esc(s.period||'')}" placeholder="Например: FNCS, ноябрь 2026, Trio"></div>${fields.map(([key,label])=>`<div class="field"><label for="stat-${key}">${label}</label><input id="stat-${key}" name="${key}" type="number" min="0" max="100000" step="1" value="${s[key]??''}"></div>`).join('')}</div><div class="field"><label for="stat-notes">Что ещё важно для интерпретации?</label><textarea id="stat-notes" name="notes" maxlength="500" placeholder="Формат очков, смена состава, этап турнира, что сам заметил">${esc(s.notes||'')}</textarea></div><p class="fine">Все числа относятся к указанному периоду. Если смешать разные турниры, выводы могут быть ложными.</p><button class="btn secondary small" type="submit">Сохранить турнирные результаты</button></form>
  <div class="profile-findings">${findings.map(f=>`<div class="profile-finding ${f.kind}"><strong>${esc(f.title)}</strong><p>${esc(f.detail)}</p></div>`).join('')}</div>
  <div class="ws-ai-advice"><span class="eyebrow">РАЗБОР ПРОФИЛЯ ОТ AI-ТРЕНЕРА</span><h3>Что проверить по твоим результатам?</h3>${review?`<p class="ws-advice-text">${formatReview(review.text)}</p><p class="fine">${esc(review.date)}${stale?' · Показатели изменились — попроси новый разбор.':''}</p>`:'<p>Тренер сопоставит твой формат, роль, PR, турнирные результаты и собственные заметки. Он предложит одну проверку под тебя, не выдавая цифры за диагноз.</p>'}${error?`<p class="error" role="alert">${esc(error)}</p>`:''}<button class="btn" type="button" data-profile-review ${pending?'disabled':''}>${pending?'Тренер разбирает…':review?'Обновить разбор профиля →':'Разобрать мой профиль →'}</button></div></section>`;
}
export function installProfilePanel(options) {
  api = options;
  document.addEventListener('submit', event => {
    if (event.target.id !== 'tournament-stats-form') return;
    event.preventDefault();
    const s = api.getState(), data = new FormData(event.target), next = {};
    for (const [key] of fields) {
      const raw = String(data.get(key)||'').trim(), num = Number(raw);
      if (raw && (!Number.isInteger(num) || num < 0 || num > 100000)) { api.toast('Проверь число в турнирных показателях.'); return; }
      next[key] = raw ? num : null;
    }
    if (next.matches !== null && ((next.early !== null && next.early > next.matches) || (next.topTen !== null && next.topTen > next.matches))) { api.toast('Ранних вылетов и попаданий в топ-10 не может быть больше матчей.'); return; }
    Object.assign(s.stats, next, { period:String(data.get('period')||'').trim().slice(0,60), notes:String(data.get('notes')||'').trim().slice(0,500), updated:dayKey() });
    if (api.save()) { api.render(); api.toast('Результаты сохранены и доступны тренеру.'); }
  });
  document.addEventListener('click', async event => {
    if (!event.target.closest('[data-profile-review]') || pending) return;
    const s = api.getState(); pending = true; error = ''; api.render();
    try {
      const response = await fetch(AI_ENDPOINT+'/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(profileReviewRequest(s))});
      const data = await response.json();
      if (!response.ok || !data.answer) throw Error(data.error==='player_daily_limit'?'Лимит сообщений на сегодня исчерпан. Попробуй завтра.':'Тренер сейчас недоступен. Попробуй позже.');
      if (/\d+(?:[.,]\d+)?\s*%/.test(data.answer)) throw Error('AI повторил числа, которые могут быть неточными. Используй проверенные показатели выше и попроси разбор ещё раз.');
      s.profileReview = { text:String(data.answer).slice(0,5000), fingerprint:playerContext(s), date:dayKey() };
      if (!api.save()) throw Error('Не удалось сохранить разбор. Проверь свободное место в браузере.');
    } catch (cause) { error = cause.message || 'Не удалось получить разбор.'; }
    finally { pending = false; api.render(); }
  });
}

import { AI_ENDPOINT } from './ai-config.mjs';
import { dayKey } from './engine.mjs?v=20261101-vision';
import { profileFindings } from './player-context.mjs?v=20261101-tournaments';
import { coachContext } from './coach-continuity.mjs?v=20261101-tournaments';
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
let api, pending = false, controller = null, error = '';
const ready = /^https:\/\/[^/]+\.workers\.dev$/.test(AI_ENDPOINT);
function refresh() { if (location.hash === '#coach') api.render(); }
function context(state) {
  const c = state.cases?.find(x => x.id === state.activeCase);
  const check = state.checkins?.[dayKey()];
  return coachContext(state, c, check);
}
function history(state) {
  return (state.aiMessages || []).filter(m => ['user', 'assistant'].includes(m.role) && typeof m.text === 'string' && m.text.trim() && (m.role === 'user' || m.status === 'complete')).slice(-11).map(m => ({ role: m.role, content: m.text.slice(0, 1800) }));
}
export function resetAI() { controller?.abort(); controller = null; pending = false; error = ''; }
export function renderAIChat() {
  const s = api.getState(), messages = s.aiMessages || [];
  const status = pending ? 'Тренер отвечает…' : ready ? 'AI-тренер на связи' : 'Серверный AI ещё не подключён';
  const profileSignal = profileFindings(s.stats)[0];
  return `<div class="workspace ai-page"><div class="ws-heading"><div><span class="eyebrow">FORTNITE AI COACH</span><h1>Чат с AI-тренером</h1><p>Напиши своими словами, что хочешь разобрать. Можно задать и другой вопрос.</p></div><a class="btn secondary" href="#plan">Мой план →</a></div><div class="ai-layout"><section class="card ai-window"><div class="ai-status"><strong>${status}</strong><span>Серверная нейросеть</span><button class="btn secondary" data-ai-new ${pending ? 'disabled' : ''}>Новая беседа</button></div>${!ready ? '<div class="ai-load"><h2>Подключаем AI-тренера</h2><p>Для запуска нужен серверный адрес нейросети. Посетителям не потребуется скачивать модель или входить в ChatGPT.</p></div>' : ''}${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}<div class="ai-log" id="ai-log" role="log" aria-label="Переписка с AI-тренером">${messages.length ? messages.map(m => `<div class="message ${m.role === 'user' ? 'user' : 'coach'}"><small>${m.role === 'user' ? 'ТЫ' : 'AI-ТРЕНЕР'}</small><div>${esc(m.text)}</div></div>`).join('') : '<div class="ai-empty"><h2>Начни с конкретной ситуации</h2><p>Например: «Мы проиграли контест за локу. Как разобрать причину?» Если пока не знаешь, что проседает, так и напиши.</p></div>'}${pending ? '<div class="message coach"><small>AI-ТРЕНЕР</small><div>Думаю…</div></div>' : ''}</div><form id="ai-form" class="ws-compose"><label for="ai-message">Сообщение тренеру</label><textarea id="ai-message" name="message" maxlength="1800" required placeholder="Опиши ситуацию или задай вопрос…">${esc(s.aiDraft || '')}</textarea><div class="actions"><button class="btn" type="submit" ${!ready || pending ? 'disabled' : ''}>Отправить →</button>${pending ? '<button class="btn secondary" type="button" data-ai-stop>Остановить</button>' : ''}</div></form></section><aside class="stack"><section class="card"><h2>Контекст игрока</h2><p>${esc(s.profile?.mode)} · ${esc(s.profile?.team)} · ${esc(s.profile?.team === 'Solo' ? 'Все роли' : s.profile?.role)}</p><p>${esc(s.profile?.focus)}</p><p><strong>${esc(profileSignal.title)}</strong><br>${esc(profileSignal.detail)}</p><p>Показатели из профиля передаются тренеру как данные игрока. Ссылки на трекеры он не открывает.</p><p>Тренер видит твой профиль, описание текущего эпизода и последние сообщения. Он не просматривает видео и трекеры автоматически.</p></section><section class="card"><h3>Как это работает</h3><p>Текст отправляется на сервер AI для ответа. Модель не загружается на твой компьютер. Бесплатный дневной лимит сервиса может закончиться — тогда чат временно сообщит об этом.</p></section></aside></div></div>`;
}
export function mountAI() { const log = document.querySelector('#ai-log'); if (log) log.scrollTop = log.scrollHeight; }
export function installAI(options) {
  api = options;
  document.addEventListener('input', event => { if (event.target.id === 'ai-message') { api.getState().aiDraft = event.target.value; api.save(); } });
  document.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.hasAttribute('data-ai-stop')) { controller?.abort(); return; }
    if (button.hasAttribute('data-ai-new') && !pending) {
      const s = api.getState(); if (s.aiMessages?.length) s.aiArchives = [s.aiMessages.slice(-80), ...(s.aiArchives || [])].slice(0, 5);
      s.aiMessages = []; s.aiDraft = ''; api.save(); refresh();
    }
  });
  document.addEventListener('submit', async event => {
    if (event.target.id !== 'ai-form') return;
    event.preventDefault();
    if (!ready || pending) return;
    const s = api.getState(), message = String(new FormData(event.target).get('message') || '').trim();
    if (!message) return;
    s.aiMessages ||= []; s.aiMessages.push({ role: 'user', text: message, status: 'complete' });
    s.aiMessages = s.aiMessages.slice(-80); s.aiDraft = ''; api.save();
    pending = true; error = ''; controller = new AbortController(); refresh();
    try {
      const response = await fetch(AI_ENDPOINT + '/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ context: context(s), messages: history(s) }), signal: controller.signal });
      const data = await response.json();
      if (!response.ok && data.error === 'player_daily_limit') throw Error('Лимит сообщений тренеру на сегодня исчерпан. Он обновится в 03:00 по Москве.');
      if (!response.ok) throw Error(data.error === 'daily_limit' ? 'Бесплатный дневной лимит AI закончился. Чат заработает снова после его обновления.' : 'AI сейчас не отвечает. Попробуй позже.');
      s.aiMessages.push({ role: 'assistant', text: data.answer, status: 'complete', model: data.model });
      s.aiRemaining = data.remaining;
      s.aiMessages = s.aiMessages.slice(-80); api.save();
    } catch (cause) { if (cause.name !== 'AbortError') error = cause.message || 'Не удалось получить ответ.'; }
    finally { pending = false; controller = null; refresh(); }
  });
}

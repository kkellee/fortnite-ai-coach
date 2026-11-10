import { AI_ENDPOINT } from './ai-config.mjs';
import { profileFindings, profileReviewRequest, playerContext } from './player-context.mjs?v=20261101-tournaments';
import { dayKey } from './engine.mjs?v=20261101-vision';
import { putFile, getFile, deleteFile } from './evidence.mjs';
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
const formatReview = value => esc(value).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
let api, pending = false, error = '';
let imageUrl = '';
const fields = [['matches','Турнирных матчей'],['early','Ранних вылетов'],['topTen','Попаданий в топ-10'],['eliminations','Устранений']];
export function renderProfilePanel(state) {
 const review=state.profileReview,stale=review&&review.fingerprint!==playerContext(state);
 return `<section class="card profile-panel profile-review-panel"><span class="badge lime">ТРЕНЕР И ТВОИ ДАННЫЕ</span><h2>Разбор твоего профиля</h2><p>Турнирные скриншоты и результаты теперь в разделе «Заметки и турниры». Здесь остаются твой профиль, ссылки на трекеры и общий вывод тренера.</p><a class="btn secondary" href="#journal">Открыть мои турниры →</a><div class="ws-ai-advice"><span class="eyebrow">РАЗБОР ОТ AI-ТРЕНЕРА</span><h3>Что проверить по твоим результатам?</h3>${review?`<p class="ws-advice-text">${formatReview(review.text)}</p><p class="fine">${esc(review.date)}${stale?' · Данные изменились — обнови разбор.':''}</p>`:'<p>Тренер учтёт твой профиль и сохранённые результаты, если они есть. Непроверенные цифры не станут диагнозом.</p>'}${error?`<p class="error" role="alert">${esc(error)}</p>`:''}<button class="btn" type="button" data-profile-review ${pending?'disabled':''}>${pending?'Тренер разбирает…':review?'Обновить разбор профиля →':'Разобрать мой профиль →'}</button></div></section>`;
}
export function installProfilePanel(options) {
  api = options;
  document.addEventListener('change', async event => {
    if(event.target.id!=='profile-image')return;
    const file=event.target.files?.[0],s=api.getState();if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8_000_000){api.toast('Выбери PNG, JPG или WebP до 8 МБ.');return;}
    const id=crypto.randomUUID(),previous=s.profileScreenshot;
    const oldText=s.stats.screenshotText,oldReview=s.profileReview;
    try{await putFile(id,file);s.profileScreenshot={id,name:file.name.slice(0,120),date:dayKey()};s.stats.screenshotText='';s.profileReview=null;if(!api.save())throw Error('Не удалось сохранить скриншот.');if(previous)try{await deleteFile(previous.id);}catch{}api.render();api.toast('Скриншот прикреплён. Нажми «Прочитать скриншот».');}
    catch(cause){s.profileScreenshot=previous;s.stats.screenshotText=oldText;s.profileReview=oldReview;try{await deleteFile(id);}catch{}api.toast(cause.message||'Не удалось сохранить файл.');}
  });
  document.addEventListener('submit', event => {
    if(event.target.id==='screenshot-text-form'){event.preventDefault();const s=api.getState();s.stats.screenshotText=String(new FormData(event.target).get('text')||'').trim().slice(0,1200);s.profileReview=null;if(api.save()){api.render();api.toast('Исправленный текст доступен тренеру.');}return;}
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
    if(event.target.closest('[data-profile-remove]')){const s=api.getState(),old=s.profileScreenshot;if(!old)return;s.profileScreenshot=null;s.stats.screenshotText='';s.profileReview=null;if(api.save()){try{await deleteFile(old.id);}catch{}api.render();api.toast('Скриншот убран из профиля.');}return;}
    if(event.target.closest('[data-profile-read]')&&!pending){const s=api.getState(),shot=s.profileScreenshot;if(!shot)return;pending=true;error='';api.render();try{const row=await getFile(shot.id);if(!row?.file)throw Error('Файл больше не доступен. Прикрепи скриншот заново.');const image=await compactImage(row.file);const response=await fetch(AI_ENDPOINT+'/image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image})});const data=await response.json();if(!response.ok||!data.answer)throw Error(data.error==='player_daily_limit'?'Лимит AI на сегодня исчерпан.':'Не удалось прочитать скриншот. Попробуй другой файл.');s.stats.screenshotText=String(data.answer).slice(0,1200);s.profileReview=null;if(!api.save())throw Error('Не удалось сохранить распознанный текст.');}catch(cause){error=cause.message||'Не удалось прочитать скриншот.';}finally{pending=false;api.render();}return;}
    if (!event.target.closest('[data-profile-review]') || pending) return;
    const s = api.getState(); pending = true; error = ''; api.render();
    try {
      const response = await fetch(AI_ENDPOINT+'/analysis',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(profileReviewRequest(s))});
      const data = await response.json();
      if (!response.ok || !data.answer) throw Error(data.error==='player_daily_limit'?'Лимит сообщений на сегодня исчерпан. Попробуй завтра.':'Тренер сейчас недоступен. Попробуй позже.');
      if (/\d+(?:[.,]\d+)?\s*%/.test(data.answer)) throw Error('AI повторил числа, которые могут быть неточными. Используй проверенные показатели выше и попроси разбор ещё раз.');
      s.profileReview = { text:String(data.answer).slice(0,5000), fingerprint:playerContext(s), date:dayKey() };
      if (!api.save()) throw Error('Не удалось сохранить разбор. Проверь свободное место в браузере.');
    } catch (cause) { error = cause.message || 'Не удалось получить разбор.'; }
    finally { pending = false; api.render(); }
  });
}
async function compactImage(file){
  const bitmap=await createImageBitmap(file),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  try{let scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));for(let i=0;i<4;i++){canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/jpeg',0.85);if(data.length<1_400_000)return data;scale*=0.75;}throw Error('Скриншот слишком большой. Обрежь его до нужной статистики.');}finally{bitmap.close();}
}
export async function mountProfilePanel(state){
  if(imageUrl){URL.revokeObjectURL(imageUrl);imageUrl='';}
  const target=document.querySelector('#profile-image-preview'),id=state.profileScreenshot?.id;
  if(!target||!id)return;
  try{const row=await getFile(id);if(!row?.file){const note=document.createElement('p');note.className='error';note.textContent='Скриншот не найден в этом браузере. Прикрепи его ещё раз; распознанный текст сохранён.';target.replaceWith(note);return;}imageUrl=URL.createObjectURL(row.file);if(document.querySelector('#profile-image-preview')===target)target.src=imageUrl;}catch{}
}

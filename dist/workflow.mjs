// Serializable case records. Evidence files live separately in IndexedDB.
const str=(v,n=3000)=>typeof v==='string'?v.slice(0,n):'';
export const stages=['material','discussion','practice','complete'];
export function newCase(profile,id,date){return {id,date,stage:'material',focus:profile.focus,team:profile.team,role:profile.team==='Solo'?'Solo':profile.role,mode:profile.mode,build:profile.build,note:'',answerDraft:'',link:'',action:'',measure:'',outcome:'',next:'',aiAdvice:'',aiOutcomeAdvice:'',answers:[],files:[]};}
export function cleanCases(value){return (Array.isArray(value)?value:[]).filter(c=>c&&/^[a-zA-Z0-9-]{1,80}$/.test(c.id)&&stages.includes(c.stage)).slice(0,30).map(c=>({id:c.id,date:str(c.date,10),stage:c.stage,focus:str(c.focus,60),team:str(c.team,20),role:str(c.role,30),mode:str(c.mode,30),build:str(c.build,20),note:str(c.note),answerDraft:str(c.answerDraft,2000),link:safeLink(c.link),action:str(c.action,1000),measure:str(c.measure,1000),outcome:str(c.outcome),next:str(c.next,1000),aiAdvice:str(c.aiAdvice,4500),aiOutcomeAdvice:str(c.aiOutcomeAdvice,4500),answers:(Array.isArray(c.answers)?c.answers:[]).filter(x=>typeof x==='string').slice(0,3).map(x=>x.slice(0,2000)),files:(Array.isArray(c.files)?c.files:[]).filter(f=>f&&/^[a-zA-Z0-9-]{1,80}$/.test(f.id)&&typeof f.name==='string'&&Number.isFinite(f.size)&&f.size>=0).slice(0,3).map(f=>({id:f.id,name:str(f.name,200),size:f.size,type:str(f.type,100)}))}));}
export function safeLink(v){try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
export function questions(c){
 if(c.focus==='Общий импрув — пока не знаю, что проседает')return ['Выбери один момент, где решение могло изменить ход игры. Что ты знал до действия, что решил и что произошло после?','Какая ситуация повторяется? Что ты точно видел, а что пока только предполагаешь?','Какой один момент стоит проверить на записи или в следующей игре?'];
 const opening={
  'Контест за локу':'Где ты залендился, какой лут успел взять и что видел о сопернике перед первым контактом?',
  'Файты':'Перед первым разменом: сколько было HP, какой лут и укрытие? Что ты знал о сопернике?',
  'Ротации':'Перед выходом: где была следующая зона, сколько времени и какие ресы или мобильность оставались?',
  'Late game':c.build==='Zero Build'?'До спорного решения: какие были укрытия, путь в зону, HP и мобильность?':'До спорного решения: какой был слой, сколько ресов и был ли доступен рефреш?',
  'Коммуникация':'Какой колл прозвучал? Запиши точную фразу, ответ тиммейта и действие после него.'
 };
 const role=c.role==='Solo'?'Какое решение ты принял и какую альтернативу видел именно тогда?':c.role==='IGL'?'Что ты заколлил и где в этот момент были тиммейты? Что они знали из твоего колла?':c.role==='Саппорт'?'Как второй фраггер: где ты был относительно команды, какой колл получил и какой рефреш или размен искал?':'Какой колл ты получил, где находился относительно команды и какое окно для демейджа использовал?';
 return [opening[c.focus]||'Что происходило перед решением? Укажи таймкод, HP, ресы и известную тебе информацию.',role,'Что, по твоей версии, стоило изменить? Отдели то, что видно на записи, от предположения. Если записи нет — так и укажи.'];
}
export function moveCase(c,event,data={}){
 const next={...c};
 if(event==='back'){
  const target=String(data.to||'');
  if(!stages.includes(target)||stages.indexOf(target)>=stages.indexOf(c.stage))throw Error('К этому шагу нельзя вернуться.');
  next.stage=target;
 }else if(event==='discuss'){
  if(c.stage!=='material'||!c.note.trim())throw Error('Сначала опиши один эпизод или результат.');
  next.stage='discussion';
 }else if(event==='answer'){
  const text=String(data.text||'').trim();
  if(c.stage!=='discussion'||!text||c.answers.length>=1)throw Error('Ответь на текущий вопрос.');
  next.answers=[...c.answers,text.slice(0,2000)];
 }else if(event==='practice'){
  if(c.stage!=='discussion'||c.answers.length<1||!c.action.trim()||!c.measure.trim())throw Error('Обозначь цепочку событий, действие и способ его проверки.');
  next.stage='practice';
 }else if(event==='finish'){
  if(c.stage!=='practice'||!c.outcome.trim()||!c.next.trim())throw Error('Запиши результат и следующий шаг.');
  next.stage='complete';
 }else throw Error('Неизвестный шаг.');
 return next;
}

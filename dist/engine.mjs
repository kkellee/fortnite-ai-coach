import {GENERAL_FOCUS,cleanAI} from './ai-context.mjs';
import {cleanCases} from './workflow.mjs?v=20261101-feedback';
import {cleanTournaments} from './tournaments.mjs?v=20261110-readout';
import {exerciseFor} from './practice-catalog.mjs?v=20261101-stepnav';
export const MODES = ['Battle Royale','Reload'];
export const TEAMS = ['Solo','Duo','Trio'];
export const ROLES = ['IGL','Фраггер','Саппорт'];
export const FOCI = [GENERAL_FOCUS,'Контест за локу','Файты','Ротации','Late game','Коммуникация'];
export const dayKey = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const freshState=()=>({version:1,profile:null,checkins:{},completed:{},sessions:[],tournaments:[],tournamentReview:null,messages:[],stats:{pr:null,earnings:null,events:null,matches:null,eliminations:null,topTen:null,early:null,period:'',notes:'',updated:'',screenshotText:''},profileScreenshot:null,profileReview:null,review:null});
export function validProfile(p){return !!p && typeof p.nick==='string' && p.nick.trim().length>0 && p.nick.length<=32 && MODES.includes(p.mode) && TEAMS.includes(p.team) && ['Build','Zero Build'].includes(p.build) && (p.team==='Solo'||ROLES.includes(p.role)) && FOCI.includes(p.focus) && [20,40,60,90].includes(Number(p.minutes));}
export function parseState(raw){
 const s=typeof raw==='string'?JSON.parse(raw):raw;
 if(!s||s.version!==1||!validProfile(s.profile))throw Error('Файл не содержит совместимый профиль FORTNITE AI COACH.');
 const out=freshState();out.profile={...s.profile,nick:s.profile.nick.trim(),minutes:Number(s.profile.minutes)};
 for(const [date,v] of Object.entries(s.checkins||{})){if(/^\d{4}-\d{2}-\d{2}$/.test(date)&&v&&Number.isFinite(v.sleep)&&v.sleep>=0&&v.sleep<=24&&Number.isInteger(v.energy)&&v.energy>=1&&v.energy<=5)out.checkins[date]={sleep:v.sleep,energy:v.energy,...([20,40,60,90].includes(v.minutes)?{minutes:v.minutes}:{})};}
 for(const [date,v] of Object.entries(s.completed||{})){if(/^\d{4}-\d{2}-\d{2}$/.test(date)&&Array.isArray(v))out.completed[date]=[...new Set(v.filter(x=>['review','practice','log'].includes(x)))];}
 if(Array.isArray(s.sessions))out.sessions=s.sessions.filter(v=>v&&typeof v.date==='string'&&typeof v.note==='string'&&v.note.length<=3000&&Number.isFinite(v.matches)&&v.matches>=0&&v.matches<=100&&Number.isFinite(v.early)&&v.early>=0&&v.early<=v.matches).slice(0,365).map(v=>({...v,pinned:v.pinned===true}));
 out.tournaments=cleanTournaments(s.tournaments);
 if(s.tournamentReview&&typeof s.tournamentReview.text==='string')out.tournamentReview={text:s.tournamentReview.text.slice(0,8000),fingerprint:String(s.tournamentReview.fingerprint||'').slice(0,200),date:String(s.tournamentReview.date||'').slice(0,10)};
 if(Array.isArray(s.messages))out.messages=s.messages.filter(m=>m&&['coach','user'].includes(m.role)&&typeof m.text==='string'&&m.text.length<=5000).slice(-100);
 for(const k of ['pr','earnings','events','matches','eliminations','topTen','early']){const n=s.stats?.[k];out.stats[k]=Number.isFinite(n)&&n>=0&&n<=1000000000?n:null;}
 if(out.stats.matches!==null){for(const k of ['topTen','early'])if(out.stats[k]>out.stats.matches)out.stats[k]=null;}
 for(const [k,max] of [['period',60],['notes',500]])out.stats[k]=typeof s.stats?.[k]==='string'?s.stats[k].slice(0,max):'';
 out.stats.updated=typeof s.stats?.updated==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s.stats.updated)?s.stats.updated:'';
 out.stats.screenshotText=typeof s.stats?.screenshotText==='string'?s.stats.screenshotText.slice(0,1200):'';
 if(s.profileScreenshot&&typeof s.profileScreenshot.id==='string'&&typeof s.profileScreenshot.name==='string')out.profileScreenshot={id:s.profileScreenshot.id.slice(0,80),name:s.profileScreenshot.name.slice(0,120),date:String(s.profileScreenshot.date||'').slice(0,10)};
 if(s.profileReview&&typeof s.profileReview.text==='string')out.profileReview={text:s.profileReview.text.slice(0,5000),fingerprint:String(s.profileReview.fingerprint||'').slice(0,3000),date:String(s.profileReview.date||'').slice(0,10)};
 if(s.review&&typeof s.review.note==='string')out.review={note:s.review.note.slice(0,3000),stage:String(s.review.stage||'').slice(0,50)};
 out.cases=cleanCases(s.cases);out.activeCase=out.cases.some(c=>c.id===s.activeCase)?s.activeCase:out.cases[0]?.id;
 out.aiArchives=(Array.isArray(s.aiArchives)?s.aiArchives:[]).slice(0,5).map(a=>cleanAI(a));out.aiMessages=cleanAI(s.aiMessages);out.aiDraft=typeof s.aiDraft==='string'?s.aiDraft.slice(0,1800):'';
 return out;
}
export function makePlan(p,checkin={},date=dayKey()){
 if(!validProfile(p))return [];
 const low=dailyLoad(checkin)==='light';
 const available=[20,40,60,90].includes(checkin.minutes)?checkin.minutes:p.minutes;
 const budget=available;
 let focus=p.focus;
 if(p.team==='Solo'&&focus==='Коммуникация')focus='Ротации';
 const exercise=exerciseFor(focus,date);const first=Math.max(3,Math.floor(budget*.2)),practice=budget-first-3;
 const role=p.team==='Solo'?'Сформулируй своё решение до действия и запиши причину.':p.role==='IGL'?'Перед действием назови план, маршрут и условие смены решения.':p.role==='Фраггер'?'Перед входом согласуй цель с IGL. После файта отметь, какой урон помог команде реализовать решение.':'В роли второго фраггера отметь своё расстояние до команды и доступные возможности для рефреша. Обязанности уточните с IGL.';
 return [
 {id:'review',kind:'ПОДГОТОВКА',minutes:first,title:'Выбери проверяемое решение',steps:[`Тема: ${exercise.title}. Вспомни один похожий эпизод и назови момент, когда решение ещё можно было изменить.`, 'Запиши цепочку: что было известно → что ты сделал → что случилось. Не путай наблюдение с догадкой о причине.'],metric:'Одна гипотеза перед практикой.'},
 {id:'practice',kind:low?'СПОКОЙНАЯ ТРЕНИРОВКА':'ПРАКТИКА',minutes:practice,title:exercise.title,steps:low?[`Найди в записи два момента для упражнения «${exercise.title}». Останови повтор до решения и назови, что было известно и какой вариант ты выбрал бы сейчас.`,`Сравни свой вариант с реальным действием. Не объявляй его лучшим без проверки в игре.`,'Не заставляй себя играть через усталость; при необходимости сократи сессию.']:[exercise.setup,role,`Проверка: ${exercise.measure}`],metric:low?'Два просмотренных эпизода и одно условие для проверки в следующий игровой день.':exercise.measure},
 {id:'log',kind:'ИТОГ',minutes:3,title:'Зафиксируй результат',steps:['Запиши, сколько подходящих ситуаций было и удалось ли выполнить решение.','Если ситуаций не было, не делай вывод об эффективности упражнения.'],metric:'Одна запись с результатом проверки.'}
 ];
}
export function dailyLoad(checkin={}){
 return (Number.isFinite(checkin.energy)&&checkin.energy<=2)||(Number.isFinite(checkin.sleep)&&checkin.sleep<6)?'light':'normal';
}
export function summary(s){
 const p=s.profile;if(!validProfile(p))return 'Сначала пройди стартовый опрос.';
 const games=s.sessions.reduce((n,x)=>n+x.matches,0),early=s.sessions.reduce((n,x)=>n+x.early,0);
 return `${p.nick}, твоя отправная точка — ${p.mode}, ${p.team}, ${p.build}${p.team==='Solo'?'':`, роль ${p.role}`}. Ты выбрал фокус «${p.focus}» и ${p.minutes} минут на сессию. Поэтому стартуем с одного решения в этом контексте и проверяем его в практике. ${games?`В твоём журнале ${games} матчей, из них ${early} отмечены как ранние вылеты (${Math.round(early/games*100)}%). Это введённые тобой данные, а не доказательство причины поражений.`:'Игровых результатов пока нет. Оценивать твой уровень или перспективы по одной анкете нельзя.'}`;
}
export function coachReply(text,s){
 const t=text.toLowerCase(),p=s.profile;
 if(/мет[ауеы]|патч|сезон|оруж|лутпул/.test(t))return 'Актуальная сезонная база пока не проверена. Я не буду выбирать оружие или локу по устаревшим данным. Назови патч и конкретный турнир: это нужно сверить с его правилами и доступным лутом.';
 if(/устал|выгор|не спал|не высп|отдых/.test(t))return 'Нагрузку стоит подстроить под твоё состояние. Отметь энергию в кабинете — при низкой оценке план станет короче. Ты хочешь сегодня закончить тренировку или оставить только спокойный разбор одного момента?';
 if(/выиграл|получилось|топ.?1|побед/.test(t))return 'Хороший результат стоит зафиксировать. Какое конкретно твоё решение помогло и что из этого можно повторить? Один удачный исход ещё не показывает стабильность; добавь факт в журнал и продолжай по плану с запланированным отдыхом.';
 if(/клип|реплей|видео|скрин/.test(t))return 'Открой «Разбор момента»: там можно посмотреть свой клип или скрин и сохранить описание. В этой версии я ещё не распознаю содержимое файлов. Напиши момент по таймкоду, что ты видел перед решением и что сделал — тогда можно сформулировать проверяемую гипотезу.';
 if(/слил|проиграл|умер|контест|файт/.test(t))return `Разберём один эпизод ${p?.team||''}, без догадок по одному исходу. Что было у тебя по HP, луту и ресам перед решением? И почему ты решил принять этот файт именно тогда? Сохрани свою версию в «Разборе момента»; пока это описание игрока, а не подтверждённая ошибка.`;
 if(/план|трен|делать/.test(t))return p?`Твой текущий фокус — «${p.focus}». В плане уже есть разбор, практика одного изменения и короткий итог. Какое действие из плана сейчас непонятно?`:'Пройди опрос — план зависит от режима, роли и времени.';
 return 'Я сохранил твоё сообщение. Сейчас включён базовый диалог по правилам, без языковой модели: свободно разбирать произвольные ситуации он пока не умеет. Для предметного разбора выбери один эпизод: что произошло и какое своё решение ты хочешь проверить?';
}

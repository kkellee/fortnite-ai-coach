import {cleanCases} from './workflow.mjs';
export const MODES = ['Battle Royale','Reload'];
export const TEAMS = ['Solo','Duo','Trio'];
export const ROLES = ['IGL','Фраггер','Саппорт'];
export const FOCI = ['Контест за локу','Файты','Ротации','Late game','Коммуникация'];
export const dayKey = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const freshState=()=>({version:1,profile:null,checkins:{},completed:{},sessions:[],messages:[],stats:{pr:null,earnings:null,events:null},review:null});
export function validProfile(p){return !!p && typeof p.nick==='string' && p.nick.trim().length>0 && p.nick.length<=32 && MODES.includes(p.mode) && TEAMS.includes(p.team) && ['Build','Zero Build'].includes(p.build) && (p.team==='Solo'||ROLES.includes(p.role)) && FOCI.includes(p.focus) && [20,40,60,90].includes(Number(p.minutes));}
export function parseState(raw){
 const s=typeof raw==='string'?JSON.parse(raw):raw;
 if(!s||s.version!==1||!validProfile(s.profile))throw Error('Файл не содержит совместимый профиль FORTNITE AI COACH.');
 const out=freshState();out.profile={...s.profile,nick:s.profile.nick.trim(),minutes:Number(s.profile.minutes)};
 for(const [date,v] of Object.entries(s.checkins||{})){if(/^\d{4}-\d{2}-\d{2}$/.test(date)&&v&&Number.isFinite(v.sleep)&&v.sleep>=0&&v.sleep<=24&&Number.isInteger(v.energy)&&v.energy>=1&&v.energy<=5)out.checkins[date]={sleep:v.sleep,energy:v.energy};}
 for(const [date,v] of Object.entries(s.completed||{})){if(/^\d{4}-\d{2}-\d{2}$/.test(date)&&Array.isArray(v))out.completed[date]=[...new Set(v.filter(x=>['review','practice','log'].includes(x)))];}
 if(Array.isArray(s.sessions))out.sessions=s.sessions.filter(v=>v&&typeof v.date==='string'&&typeof v.note==='string'&&v.note.length<=3000&&Number.isFinite(v.matches)&&v.matches>=0&&v.matches<=100&&Number.isFinite(v.early)&&v.early>=0&&v.early<=v.matches).slice(0,365);
 if(Array.isArray(s.messages))out.messages=s.messages.filter(m=>m&&['coach','user'].includes(m.role)&&typeof m.text==='string'&&m.text.length<=5000).slice(-100);
 for(const k of ['pr','earnings','events']){const n=s.stats?.[k];out.stats[k]=Number.isFinite(n)&&n>=0?n:null;}
 if(s.review&&typeof s.review.note==='string')out.review={note:s.review.note.slice(0,3000),stage:String(s.review.stage||'').slice(0,50)};
 out.cases=cleanCases(s.cases);out.activeCase=out.cases.some(c=>c.id===s.activeCase)?s.activeCase:out.cases[0]?.id;
 return out;
}
const drills={
 'Контест за локу':{title:'Разложи свой контест',steps:['Возьми один проигранный контест за свою локу. Останови запись перед первым контактом.','Запиши, где ты залендился, что видел о сопернике и какой лут реально был доступен. Отдельно отметь неизвестное.','Выбери одно решение, которое проверишь в следующем контесте. Сравни похожие условия, а не только исход файта.'],metric:'Отметь: решение выполнено / не выполнено; причина.'},
 'Файты':{title:'Проверь первый размен',steps:['Найди три первых размена в своих записях. Для каждого отметь позицию, укрытие и доступную информацию.','Выбери один повторяющийся момент: например, выход без укрытия. В следующей практике отслеживай именно его.','После каждого подходящего файта запиши, изменилось ли решение. Победа сама по себе не доказывает, что решение было верным.'],metric:'Считай подходящие ситуации и случаи, где выполнил выбранное действие.'},
 'Ротации':{title:'Разбери один выход в зону',steps:['Останови запись перед началом ротации: отметь зону, время, ресы, мобильность и известных соперников.','Назови два доступных маршрута и риск каждого. Не используй информацию, которую увидел только в реплее.','Сравни план с тем, что сделал. В следующей игре заранее сформулируй маршрут и условие его смены.'],metric:'Запиши, был ли план до выхода и из-за чего пришлось его менять.'},
 'Late game':{title:'Найди момент потери контроля',steps:['Выбери один фрагмент late game до смерти или успешного рефреша.','Отметь слой, ресы, состояние команды и информацию перед решением. Для Zero Build вместо тарпа оцени укрытия и доступный выход.','Укажи первую точку, где появился риск, и одну альтернативу, доступную тогда. Проверь её применимость в следующей похожей ситуации.'],metric:'Один фрагмент → одно проверяемое изменение решения.'},
 'Коммуникация':{title:'Проверь один колл',steps:['Выбери короткий фрагмент с войсами до командного решения.','Запиши дословно: колл, ответ, действие. Отметь, где информация опоздала или не была понята.','Договоритесь о короткой формулировке для этой ситуации и проверьте её в следующей командной практике.'],metric:'Зафиксируй, поняли ли колл и совпало ли действие с ним.'}
};
export function makePlan(p,checkin={}){
 if(!validProfile(p))return [];
 const low=Number(checkin.energy)<=2&&checkin.energy!==undefined;
 const budget=low?Math.min(20,p.minutes):p.minutes;
 let focus=p.focus;
 if(p.team==='Solo'&&focus==='Коммуникация')focus='Ротации';
 const d=drills[focus];const first=Math.floor(budget*.4),practice=budget-first-5;
 const role=p.team==='Solo'?'Сформулируй своё решение до действия и запиши причину.':p.role==='IGL'?'Перед действием назови план, маршрут и условие смены решения.':p.role==='Фраггер'?'Перед входом согласуй цель с IGL. После файта отметь, какой урон помог команде реализовать решение.':'В роли второго фраггера отметь своё расстояние до команды и доступные возможности для рефреша. Обязанности уточните с IGL.';
 return [
 {id:'review',kind:'РАЗБОР',minutes:first,title:d.title,steps:d.steps,metric:d.metric},
 {id:'practice',kind:low?'ЛЁГКАЯ СЕССИЯ':'ПРАКТИКА',minutes:practice,title:low?'Собери план без игровой нагрузки':'Проверь одно изменение',steps:low?['Ты отметил низкую энергию. Сегодня можно ограничиться записью и подготовкой следующей сессии.',role,'Если чувствуешь, что нужен отдых, заверши занятие. Пропуск не обнуляет прошлую работу.']:[`Выбери практику под ${p.mode} · ${p.team} · ${p.build}. Если это кастомки, проверь правила конкретного лобби.`,role,'Отслеживай только выбранное действие. Если нужная ситуация не возникла, запиши это — не делай вывод по отсутствующим данным.'],metric:'Количество подходящих ситуаций и твои решения в них.'},
 {id:'log',kind:'ИТОГ',minutes:5,title:'Закрой сессию осмысленно',steps:['Запиши, что проверял и что получилось. Отдели наблюдение от своей версии причины.','Выбери один вопрос для следующего разбора. Затем сделай перерыв.'],metric:'Одна запись в журнале с конкретным следующим шагом.'}
 ];
}
export function summary(s){
 const p=s.profile;if(!validProfile(p))return 'Сначала пройди стартовый опрос.';
 const games=s.sessions.reduce((n,x)=>n+x.matches,0),early=s.sessions.reduce((n,x)=>n+x.early,0);
 return `${p.nick}, твоя отправная точка — ${p.mode}, ${p.team}, ${p.build}${p.team==='Solo'?'':`, роль ${p.role}`}. Ты выбрал фокус «${p.focus}» и ${p.minutes} минут на сессию. Поэтому стартуем с одного решения в этом контексте и проверяем его в практике. ${games?`В твоём журнале ${games} матчей, из них ${early} завершились в early game (${Math.round(early/games*100)}%). Это введённые тобой данные, а не доказательство причины поражений.`:'Игровых результатов пока нет. Оценивать твой уровень или перспективы по одной анкете нельзя.'}`;
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

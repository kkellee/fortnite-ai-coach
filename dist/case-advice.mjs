import { playerContext } from './player-context.mjs?v=20261101-groq';
export function buildAdviceRequest(caseData, profile, checkin, outcomeReview = false, stats = {}, recentChat = []) {
  const c = caseData || {}, p = profile || {};
  const brief = value => typeof value === 'string' ? value.trim().slice(0, 350) : '';
  const context = JSON.stringify({
    player: JSON.parse(playerContext({ profile: p, stats })), episodeFocus: c.focus || p.focus,
    minutesToday: checkin?.minutes ?? p.minutes,
    sleepHoursToday: checkin?.sleep ?? null,
    energyOfFiveToday: checkin?.energy ?? null,
    recentChatUnverified: recentChat.filter(m => ['user', 'assistant'].includes(m?.role) && typeof m.text === 'string').slice(-2).map(m => ({ role: m.role, text: m.text.slice(0, 160) }))
  }).slice(0,1600);
  const message = [
    outcomeReview
      ? 'Оцени результат проверки игрока по его тексту. Ты не видишь файл или статистику. Ответь по-русски, предметно: (1) выполнено ли выбранное действие по предоставленным данным; (2) что результат доказывает и чего ещё не доказывает; (3) одно следующее упражнение или изменение с условием и метрикой под режим и роль. Если игрок написал только «нет» или фактов мало, скажи, что нельзя оценить игру, и попроси одну конкретную деталь. Не больше 180 слов.'
      : 'Разбери ОДИН эпизод по описанию игрока. Ты не видишь клип, скрин, реплей или трекер. Ответь по-русски, предметно и без шаблонной похвалы. Дай: (1) что следует из написанного; (2) что остаётся гипотезой и какую деталь стоит проверить; (3) одно конкретное решение или упражнение под роль и режим, с условием применения и измеримым результатом. Учитывай сегодняшнее время и состояние. Если фактов мало, прямо скажи это и задай один точный вопрос вместо выдуманного диагноза. Не больше 180 слов.',
    `Описание: ${brief(c.note)}`,
    ...(Array.isArray(c.answers) ? c.answers.slice(0, 3).map((answer, i) => `Ответ ${i + 1}: ${brief(answer).slice(0, 220)}`) : []),
    ...(c.action ? [`Что игрок решил проверить: ${brief(c.action).slice(0, 180)}`] : []),
    ...(c.outcome ? [`Результат по словам игрока: ${brief(c.outcome).slice(0, 180)}`] : [])
  ].join('\n').slice(0, 1800);
  return { context, messages: [{ role: 'user', content: message }] };
}

// Only player-entered numbers are sent to the model. A tracker URL is a reference, not scraped evidence.
export function playerContext(state) {
  const p = state?.profile || {}, s = state?.stats || {};
  const value = key => Number.isFinite(s[key]) && s[key] >= 0 ? s[key] : null;
  return JSON.stringify({
    nickname: p.nick, mode: p.mode, team: p.team, build: p.build,
    role: p.team === 'Solo' ? 'Solo' : p.role, focus: p.focus,
    minutes: p.minutes,
    playerEnteredStats: {
      powerRanking: value('pr'), earningsUSD: value('earnings'), tournamentSessions: value('events'),
      tournamentMatches: value('matches'), eliminations: value('eliminations'),
      topTenFinishes: value('topTen'), earlyExits: value('early'),
      period: typeof s.period === 'string' ? s.period.slice(0, 60) : '',
      notes: typeof s.notes === 'string' ? s.notes.slice(0, 180) : ''
    },
    screenshotReadout: typeof s.screenshotText === 'string' ? s.screenshotText.slice(0, 320) : '',
    trackerLinkSaved: Boolean(p.tracker), osirionLinkSaved: Boolean(p.osirion),
    statsUpdated: typeof s.updated === 'string' ? s.updated : null,
    provenance: 'Цифры введены игроком и не сверены; текст скриншота распознан AI и не проверен. Ссылки не открывались.'
  });
}

export function profileFindings(stats = {}) {
  const n = key => Number.isFinite(stats[key]) && stats[key] >= 0 ? stats[key] : null;
  const matches = n('matches'), early = n('early'), topTen = n('topTen'), eliminations = n('eliminations');
  const lines = [];
  if (matches > 0 && early !== null && early <= matches) {
    const pct = Math.round(early / matches * 100);
    lines.push({ title: `${pct}% матчей закончились рано`, detail: `${early} из ${matches} по твоим данным. Если это повторяется, начни с трёх записей ранней игры: высадка, первый контакт, доступный лут.`, kind: pct >= 30 ? 'attention' : 'neutral' });
  }
  if (matches > 0 && topTen !== null && topTen <= matches) {
    lines.push({ title: `${Math.round(topTen / matches * 100)}% попаданий в топ-10`, detail: `${topTen} из ${matches}. Это результат, но без формата и системы очков он не показывает качество конкретного решения.`, kind: 'neutral' });
  }
  if (matches > 0 && eliminations !== null) {
    lines.push({ title: `${(eliminations / matches).toFixed(1)} устранений за матч`, detail: `${eliminations} за ${matches} матчей. Сравнивай только одинаковые режимы и турниры; показатель сам по себе не говорит, стоит ли чаще вступать в файты.`, kind: 'neutral' });
  }
  if (!lines.length) lines.push({ title: 'Пока нет сопоставимых матчей', detail: 'Добавь число турнирных матчей и хотя бы один результат. Тогда появятся проверяемые соотношения; PR и призовые сами по себе не раскрывают слабое место.', kind: 'neutral' });
  return lines;
}

export function profileReviewRequest(state) {
  const context = JSON.stringify({ player: JSON.parse(playerContext(state)), recentChatUnverified: (state?.aiMessages || []).filter(m => ['user', 'assistant'].includes(m?.role) && typeof m.text === 'string').slice(-2).map(m => ({ role: m.role, text: m.text.slice(0, 160) })) }).slice(0,1600);
  const s = state?.stats || {}, matches = Number(s.matches);
  const ratio = (key, suffix) => Number.isFinite(matches) && matches > 0 && Number.isFinite(s[key]) && s[key] >= 0 && (suffix || s[key] <= matches) ? `${s[key]} из ${matches} = ${suffix ? (s[key]/matches).toFixed(2)+' за матч' : Math.round(s[key]/matches*100)+'%'}` : 'нет данных';
  const message = `Составь персональное УПРАЖНЕНИЕ для анализа моих турниров на основе моего профиля. Проверенные арифметические соотношения: ранние вылеты ${ratio('early')}; топ-10 ${ratio('topTen')}; устранения ${ratio('eliminations',true)}. Они уже показаны отдельными карточками. В ответе НЕ повторяй числа, проценты и средние значения. НЕ оценивай мой уровень, стабильность, агрессию и качество игры по агрегатным показателям: по ним нельзя установить причину. НЕ называй показатели высокими, низкими или поляризованными. Ответь строго тремя короткими пунктами: 1) какую ОДНУ гипотезу проверить первой и почему именно её имеет смысл проверить, не называя её доказанным слабым местом; 2) какое наблюдение записать в следующих трёх подходящих эпизодах с учётом моей роли и формата; 3) какое следующее решение принять по собранным наблюдениям. Если данных мало, укажи, чего не хватает. Не утверждай, что открывал трекер. По-русски, до 120 слов.`;
  return { context, messages: [{ role: 'user', content: message }] };
}

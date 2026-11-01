import { tournamentStats } from './tournaments.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function dashboardInsight(state) {
  const tournaments = state.tournaments || [];
  const recent = tournaments.slice(0, 3);
  const games = recent.reduce((sum, tournament) => sum + tournamentStats(tournament).games, 0);
  const points = recent.reduce((sum, tournament) => sum + tournamentStats(tournament).points, 0);
  const kills = recent.reduce((sum, tournament) => sum + tournamentStats(tournament).kills, 0);
  const ready = recent.length === 3;
  const currentReview = ready && state.tournamentReview?.text;
  const headline = currentReview ? 'Твой разбор готов. Проверь следующий шаг.' : ready ? 'Три турнира собраны. Найди закономерность.' : 'Найди закономерность в своей игре.';
  const detail = currentReview ? `Тренер сравнил три турнира. Открой выводы и проверь их в следующей практике.` : ready ? 'Твои матчи уже дают материал для персонального разбора: сравни результаты и получи проверяемую гипотезу.' : `Запиши результаты ${3 - recent.length} ${3 - recent.length === 1 ? 'турнира' : 'турниров'} — и получи разбор на основе собственных матчей, а не общих советов.`;
  return `<section class="dash-insight" aria-label="Твоя точка роста"><div class="dash-insight-main"><span class="eyebrow">ТВОЯ ТОЧКА РОСТА</span><h2>${headline}</h2><p>${detail}</p><a class="btn" href="#journal">${currentReview ? 'Открыть мой разбор' : ready ? 'Получить персональный разбор' : 'Добавить результаты турнира'} →</a></div><div class="dash-insight-side"><span class="dash-insight-count">${recent.length}<small> / 3 турнира</small></span><div class="dash-progress" aria-label="Заполнено ${recent.length} из 3 турниров"><span style="width:${recent.length / 3 * 100}%"></span></div><p>${ready ? `${games} матчей · ${points} очков · ${kills} устранений` : 'Данные появятся здесь после записи матчей.'}</p>${recent.length ? `<small>Последний: ${esc(recent[0].name)} · ${esc(recent[0].date)}</small>` : ''}</div></section>`;
}

import { cleanReadout } from './tournament-readout.mjs';
const number = (value, max = 100000) => Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= max ? Number(value) : null;
const short = (value, max) => String(value || '').trim().slice(0, max);

export function cleanTournaments(value) {
  return (Array.isArray(value) ? value : []).slice(0, 60).map(item => {
    if (!item || typeof item.id !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !short(item.name, 100)) return null;
    const matches = (Array.isArray(item.matches) ? item.matches : []).slice(0, 20).map(match => {
      const placement = number(match?.placement, 10000), kills = number(match?.kills, 100), points = number(match?.points, 10000);
      if (!placement || kills === null || points === null) return null;
      return { placement, kills, points, damage: match.damage === '' || match.damage == null ? null : number(match.damage), teamDamage: match.teamDamage === '' || match.teamDamage == null ? null : number(match.teamDamage) };
    }).filter(Boolean);
    const screenshots = (Array.isArray(item.screenshots) ? item.screenshots : []).filter(s => s && typeof s.id === 'string' && ['tracker','damage'].includes(s.kind)).slice(0, 2).map(s => ({ id: s.id.slice(0, 80), kind: s.kind, name: short(s.name, 100) }));
    if (!matches.length && !['tracker','damage'].every(kind => screenshots.some(s => s.kind === kind))) return null;
    return {
      id: item.id.slice(0, 80), date: item.date, name: short(item.name, 100), mode: ['Battle Royale','Reload'].includes(item.mode) ? item.mode : '', build: ['Build','Zero Build'].includes(item.build) ? item.build : '', format: short(item.format, 40), teammates: short(item.teammates, 120), note: short(item.note, 500), matches,
      screenshots, readout: cleanReadout(item.readout)
    };
  }).filter(Boolean);
}

export function tournamentStats(tournament) {
  const matches = tournament.matches || [];
  const sum = key => matches.reduce((total, match) => total + (Number(match[key]) || 0), 0);
  const knownDamage = matches.filter(match => Number.isFinite(match.damage));
  return { games: matches.length, points: sum('points'), kills: sum('kills'), avgPoints: matches.length ? Math.round(sum('points') / matches.length) : null, avgKills: matches.length ? Math.round(sum('kills') / matches.length * 10) / 10 : null, topTen: matches.filter(match => match.placement <= 10).length, avgPlacement: matches.length ? Math.round(matches.reduce((total, match) => total + match.placement, 0) / matches.length) : null, bestPlacement: matches.length ? Math.min(...matches.map(match => match.placement)) : null, damage: knownDamage.length ? sum('damage') : null, damageGames: knownDamage.length };
}

export function tournamentReviewRequest(tournaments, profile) {
  const recent = cleanTournaments(tournaments).slice(0, 3);
  if (recent.length < 3 || recent.some(t => !['tracker','damage'].every(kind => t.screenshots.some(s => s.kind === kind)))) throw Error('Для разбора нужны три турнира со скриншотами Fortnite Tracker и Osirion.');
  const compact = recent.map(t => ({ id: t.id, name: t.name, date: t.date, mode: t.mode, build: t.build, format: t.format, teammates: t.teammates, note: t.note.slice(0, 120), matches: t.matches.map(m => ({ place: m.placement, kills: m.kills, points: m.points, damage: m.damage, teamDamage: m.teamDamage })), correctedReadout: t.readout }));
  const context = JSON.stringify({ player: { mode: profile?.mode, team: profile?.team, role: profile?.role, focus: profile?.focus }, tournaments: compact });
  const message = 'Разбери три турнира по приложенным снимкам Fortnite Tracker и Osirion и исправленному игроком распознаванию. Если исправленные цифры противоречат снимку, явно укажи это. Для каждого турнира и каждой читаемой игры укажи видимые очки, место, устранения, личный и командный урон. Не угадывай нечитаемые числа и не смешивай игры разных турниров; если связать строки двух снимков нельзя, скажи об этом. Сначала назови проверяемые тенденции, затем отдели факты от гипотез. Не объявляй причину смерти без эпизода или реплея. Дай две конкретные гипотезы для проверки и один первый шаг в «Работе над игрой». Не утверждай, что открыл сайты: ты видишь только приложенные снимки. Используй игровой термин «леер», не «слой». Ответь по-русски.';
  return { context, messages: [{ role: 'user', content: message }], analysisType: 'tournaments' };
}

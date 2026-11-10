const number = (value, min, max) => value === null || value === '' || value === undefined ? null : Number.isInteger(Number(value)) && Number(value) >= min && Number(value) <= max ? Number(value) : null;
export function cleanReadout(value) {
  const games = (Array.isArray(value?.games) ? value.games : []).slice(0, 20).map((game, index) => ({
    game: index + 1,
    placement: number(game?.placement, 1, 10000),
    kills: number(game?.kills, 0, 100),
    points: number(game?.points, 0, 10000),
    damage: number(game?.damage, 0, 100000),
    teamDamage: number(game?.teamDamage, 0, 100000)
  }));
  return { games, note: typeof value?.note === 'string' ? value.note.slice(0, 500) : '', updated: typeof value?.updated === 'string' ? value.updated.slice(0, 10) : '' };
}
export function parseReadout(text) {
  const value = String(text || ''), first = value.indexOf('{'), last = value.lastIndexOf('}');
  if (first < 0 || last <= first) throw Error('Тренер не смог выделить таблицу игр. Попробуй более чёткие скриншоты.');
  let json;
  try { json = JSON.parse(value.slice(first, last + 1)); } catch { throw Error('Тренер вернул нечитаемый результат. Попробуй ещё раз.'); }
  if (!Array.isArray(json?.games)) throw Error('На скриншотах не удалось распознать игры. Проверь, что видны строки турнира.');
  return cleanReadout(json);
}

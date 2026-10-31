// Проверенные сведения Epic. Это патч-заметки, а не рейтинг сильнейших стратегий.
// Данные автоматически перестают считаться текущими после объявленной смены сезона.
export const META_SOURCES = Object.freeze({
  br: 'https://communities.epicgames.com/thread/v42-40-fortnite-override-battle-royale-update-notes/AKuW',
  fortnitemares: 'https://communities.epicgames.com/thread/fortnitemares-2026-curses-battle-royale-reload-and-more/L4S8',
  reload: 'https://communities.epicgames.com/thread/fortnite-reload-42-40-update-notes/MfKw',
  next: 'https://www.fortnite.com/news/fortnite-treasure-hunters-the-greatest-adventure-of-all-time'
});

export function isMetaQuestion(text) {
  return /мет[аеуы]|патч|сезон|актуальн|сейчас.*(оруж|предмет|лока|лут)|лут.?пул|лучшее.*(оруж|лока|предмет)|что.*(заваулт|анваулт)/i.test(text);
}

export function metaBrief(now = new Date()) {
  const release = Date.parse('2026-11-01T14:00:00Z');
  const earlyReview = Date.parse('2026-11-03T00:00:00Z');
  if (now.getTime() < release) return `ПРОВЕРЕННЫЕ ОФИЦИАЛЬНЫЕ ИЗМЕНЕНИЯ НА 31.10.2026 (не вывод о сильнейшей мете). Сейчас Epic описывает BR Chapter 7 Season 4: Override. В v42.40 у Sweeper Shotgun немного увеличена скорострельность; добавлены Loot Hacks с Gatekeeper Shotgun, Hunting Rifle и Slap Splash; некоторые другие предметы убраны. Источник: ${META_SOURCES.br}. Fortnitemares добавил Bonerattler SMG и другие предметы, но Epic прямо пишет, что Ranked/Competitive получили только ЧАСТЬ изменений; не утверждай, что конкретный праздничный предмет доступен в турнире без правил этого турнира. Источник: ${META_SOURCES.fortnitemares}. В Reload v42.40 вернулись Iron Pump и Morphite Tactical Shotgun; Gatekeeper убран из общего пула, но остался на Nitemare Island. В Duo/Squads изменён таймер ребута и действия, его сокращающие. Источник: ${META_SOURCES.reload}. Epic объявила новый сезон BR на 1 ноября, поэтому эти сведения скоро устареют. Источник: ${META_SOURCES.next}. Не называй «лучшее оружие» без данных турнира и наблюдений; приводи источник и дату в ответе.`;
  if (now.getTime() < earlyReview) return `ПЕРЕХОД СЕЗОНА. Epic 30.10.2026 анонсировала на 1 ноября новый BR-сезон Treasure Hunters, новую 80-player карту Crossbones Isle, Arlong Park и Windmill Village, предметы One Piece и еженедельные изменения. Источник: ${META_SOURCES.next}. Это анонс, а не подтверждение турнирного лутпула и не рейтинг сильнейших предметов. Данные предыдущего сезона больше не используй как текущую мету. Не проси игрока пересказывать патч; объясни, какие факты известны из Epic, а что для соревновательной игры ещё не проверено.`;
  return `База патч-заметок устарела после смены сезона. Не выдавай старый лутпул за текущий и не проси игрока пересказывать патч. Скажи кратко, что текущие турнирные изменения ещё не подтверждены в базе сервиса, и дай официальные источники для проверки: ${META_SOURCES.next}, https://www.fortnite.com/competitive/rules-guidelines/rules-library. Общие принципы разбора решений остаются применимыми.`;
}

import { playerContext } from './player-context.mjs';
import { tournamentStats } from './tournaments.mjs';

// Both providers receive the same compact, player-owned record. AI conclusions remain unverified.
export function coachContext(state, episode = null, checkin = null) {
  const s = state || {};
  const c = episode || s.cases?.find(item => item.id === s.activeCase) || null;
  const player = JSON.parse(playerContext(s));
  player.screenshotReadout = player.screenshotReadout.slice(0, 180);
  player.playerEnteredStats.notes = player.playerEnteredStats.notes.slice(0, 100);
  const record = {
    player,
    today: checkin ? { sleepHours: checkin.sleep ?? null, energyOfFive: checkin.energy ?? null, minutes: checkin.minutes ?? null } : null,
    episode: c ? { focus: String(c.focus || '').slice(0, 80), description: String(c.note || '').slice(0, 180), playerPlan: String(c.action || '').slice(0, 160), playerOutcome: String(c.outcome || '').slice(0, 160) } : null,
    tournaments: (s.tournaments || []).slice(0,3).map(t => { const total=tournamentStats(t); return { name:String(t.name || '').slice(0,45), date:t.date, mode:t.mode, format:t.format, games:t.matches.length?total.games:null, points:t.matches.length?total.points:null, kills:t.matches.length?total.kills:null, screenshots:(t.screenshots||[]).map(x=>x.kind) }; }),
    continuity: {
      priorAIUnverified: [s.profileReview?.text, c?.aiAdvice, c?.aiOutcomeAdvice, s.tournamentReview?.text].filter(Boolean).map(text => String(text).slice(0, 180)),
      recentChatUnverified: (s.aiMessages || []).filter(m => ['user', 'assistant'].includes(m?.role) && typeof m.text === 'string' && (m.role === 'user' || m.status === 'complete')).slice(-2).map(m => ({ role: m.role, text: m.text.slice(0, 130) }))
    }
  };
  while (JSON.stringify(record).length > 1600 && record.continuity.recentChatUnverified.length) record.continuity.recentChatUnverified.shift();
  while (JSON.stringify(record).length > 1600 && record.continuity.priorAIUnverified.length > 1) record.continuity.priorAIUnverified.shift();
  while (JSON.stringify(record).length > 1600 && record.tournaments.length > 1) record.tournaments.pop();
  if (JSON.stringify(record).length > 1600) record.player.screenshotReadout = '';
  if (JSON.stringify(record).length > 1600) record.player.playerEnteredStats.notes = '';
  if (JSON.stringify(record).length > 1600 && record.episode) record.episode.description = record.episode.description.slice(0, 80);
  if (JSON.stringify(record).length > 1600) record.continuity.priorAIUnverified = [];
  return JSON.stringify(record);
}

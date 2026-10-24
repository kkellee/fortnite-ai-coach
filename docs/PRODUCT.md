# Product requirements and honest implementation boundary

## Accepted scope

An accessible, initially free Fortnite competitive coach. The player's communication is central. Short onboarding and targeted follow-up questions; no mandatory trial review or fixed 30-day gate. Personalise for Battle Royale/Reload, Build/Zero Build, Solo/Duo/Trio, role, time, experience, state and session results. Serious discipline without humiliation or pressure to neglect rest. Praise specific evidence of good decisions. Player remains responsible for practice.

IGL leads decisions; fragger focuses on useful damage and realisation of team plans; Trio support is treated as a second fragger, with exact responsibilities agreed by the team. Solo combines responsibilities. Terminology: залендиться (е), контест за локу, файт, лут, ресы, тарп, рефреш, early/mid/late game. Avoid rigid claims about universally fixed duties.

## Evidence model

Each future claim needs provenance (player statement, provider data, visible clip evidence), patch/mode/tournament context, uncertainty and alternatives. Loss does not establish an error; a win does not validate a decision. Never invent PR, earnings, career history or exact match mistakes. A unique report must follow player evidence, not cosmetic wording variation.

## Data integration backlog

Osirion API research is saved in the parent project's work/ and outputs/wheat-check/. A prior lookup and stats test succeeded, but API access/terms, current schema, CORS, caching and rate limits need fresh verification before production. Full PR/earnings history is not established. Fortnite Tracker URLs are stored for review, not automatically scraped. No paid subscriptions or shared Discord account automation. No credentials in client assets.

## AI and media backlog

Select an affordable inference path with owner approval of any costs; this version enables no paid inference. Implement server-side inference and user-isolated persistence, then evaluate on owner-reviewed examples. Clips should be short, include context before/after decisions and preferably team voice with participant consent. Uploaded .replay needs a version-compatible parser; no voice is assumed inside it. Model must abstain if footage is unreadable, context missing or parsing fails. Compare pro play only under comparable patch/format/position conditions; do not blindly imitate outcomes.

## Knowledge and updates backlog

Version knowledge by patch, mode, tournament rules and source date. Official patch notes establish changes, not the entire competitive meta. Build reviewed drills from coach/player sources with source citations and reuse permissions. Track unknowns; retired advice must not be retrieved. An automated update detector should mark affected advice unavailable, notify owner and require validated refresh before re-enabling it. Keep profile/history and unaffected functions usable where possible. No monitor is running in this release.

## Future launch requirements

Provider integration tests; privacy/access rules for each player's records and clips; LLM refusal/uncertainty tests; media limits and deletion; source/patch review; evaluation against owner labels; actual monitoring tests; no claims of autonomous self-training. User feedback updates a reviewed knowledge base, not model weights automatically. Public launch and monetisation (ads/developer Telegram) remain separate decisions.

## Visual direction

Name: Fortnite AI Coach. Owner requested a light, maximally minimal design on 2026-10-24. White and pale gray surfaces, blue accent, generous spacing and an official Fortnite landscape image in the hero. The image is archival and does not describe the current map or meta. No implied Epic affiliation. Responsive phone-first app navigation, overview, plan, coach, review, journal, profile. Source icons are hand-authored SVG; optional Manrope font from Google Fonts.

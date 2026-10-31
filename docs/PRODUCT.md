# Product requirements and honest implementation boundary

## Accepted scope

An accessible, initially free Fortnite competitive coach. The player's communication is central. Short onboarding and targeted follow-up questions; no mandatory trial review or fixed 30-day gate. Personalise for Battle Royale/Reload, Build/Zero Build, Solo/Duo/Trio, role, time, experience, state and session results. Serious discipline without humiliation or pressure to neglect rest. Praise specific evidence of good decisions. Player remains responsible for practice.

IGL leads decisions; fragger focuses on useful damage and realisation of team plans; Trio support is treated as a second fragger, with exact responsibilities agreed by the team. Solo combines responsibilities. Terminology: залендиться (е), контест за локу, файт, лут, ресы, тарп, рефреш, early/mid/late game. Avoid rigid claims about universally fixed duties.

## Evidence model

Each future claim needs provenance (player statement, provider data, visible clip evidence), patch/mode/tournament context, uncertainty and alternatives. Loss does not establish an error; a win does not validate a decision. Never invent PR, earnings, career history or exact match mistakes. A unique report must follow player evidence, not cosmetic wording variation.

## Data integration backlog

Osirion API research is saved in the parent project's work/ and outputs/wheat-check/. A prior lookup and stats test succeeded, but API access/terms, current schema, CORS, caching and rate limits need fresh verification before production. Full PR/earnings history is not established. Fortnite Tracker URLs are stored for review, not automatically scraped. No paid subscriptions or shared Discord account automation. No credentials in client assets.

## AI and media backlog

Server-side inference now runs on the free Cloudflare Workers AI allocation. User-isolated cloud persistence and owner-reviewed evaluations remain to be built. Clips should be short, include context before/after decisions and preferably team voice with participant consent. Uploaded .replay needs a version-compatible parser; no voice is assumed inside it. Model must abstain if footage is unreadable, context missing or parsing fails. Compare pro play only under comparable patch/format/position conditions; do not blindly imitate outcomes.

## Knowledge and updates backlog

Version knowledge by patch, mode, tournament rules and source date. Official patch notes establish changes, not the entire competitive meta. Build reviewed drills from coach/player sources with source citations and reuse permissions. Track unknowns; retired advice must not be retrieved. An automated update detector should mark affected advice unavailable, notify owner and require validated refresh before re-enabling it. Keep profile/history and unaffected functions usable where possible. No monitor is running in this release.

## Future launch requirements

Provider integration tests; privacy/access rules for each player's records and clips; LLM refusal/uncertainty tests; media limits and deletion; source/patch review; evaluation against owner labels; actual monitoring tests; no claims of autonomous self-training. User feedback updates a reviewed knowledge base, not model weights automatically. Public launch and monetisation (ads/developer Telegram) remain separate decisions.

## Visual direction

Name: Fortnite AI Coach. Owner requested a light, maximally minimal design on 2026-10-24. White and pale gray surfaces, blue accent, generous spacing and an official Fortnite landscape image in the hero. The image is archival and does not describe the current map or meta. No implied Epic affiliation. Responsive phone-first app navigation, overview, plan, coach, review, journal, profile. Source icons are hand-authored SVG; optional Manrope font from Google Fonts.

## Connected practice workflow — 2026-10-25

Plan, coach and review routes now share a case workspace: material → three contextual questions → player-authored action and measurement → outcome and next step. Finishing writes a linked journal entry. This is a guided self-review, explicitly NOT an LLM or automated media verdict. Cases and text drafts persist in localStorage; up to three files / 100 MB per case persist in IndexedDB. JSON backups include text and metadata, not blobs; missing files are disclosed on import. Reset clears both stores. Previous messages remain readable. No provider integration, credentials or paid inference added.

## Local language model chat — 2026-10-26

Historical implementation, now replaced by server-side AI. The coach route previously used WebLLM 0.2.86 and Qwen3-4B on the visitor's device; WebGPU and a large download prevented many players from using it. Current cloud chat receives profile, current case text and bounded recent messages, not binary evidence or live statistics. General improvement focus starts with observations instead of a predetermined weakness. Early outcomes now have a plain Russian definition.

## Full conversation review — 2026-10-31

The product began with two linked ideas: a personalised player/career analysis using legitimate statistics and evidence, and an ongoing AI coach that helps the player improve. They must not be confused. The current product has a live text coach and a guided self-review flow; it has neither a verified career verdict nor automatic match analysis. A unique final report must combine verified stats, player's own account, observed decisions, uncertainties and next steps. Changing only the wording does not make the analysis unique.

Onboarding asks for mode (Battle Royale or Reload, Build or Zero Build), Solo/Duo/Trio, team role where applicable, available time and an initial concern. Offer «Общий импрув — пока не знаю, что проседает» so the coach can diagnose from observations instead of assuming a weakness. Do not ask whether the player wants to improve as a generic goal question, and do not gate the service behind a mandatory trial review or a fixed 30-day plan. The intended interaction is a continuing conversation, not a long one-time report or a rigid questionnaire.

The coach should ask about one episode at a time: where the player залендился, whether there was a контест за локу, what information and loot were available, what the player or IGL called, what decision they made, what they thought went wrong, and what actually happened. Bring in early/mid/late game, fight choice, rotations, resources, Storm Surge, tarp and refreshes only if relevant. Account for a tournament's scoring system before judging whether to play for placement or eliminations. The Trio support is a second fragger and often the trailing player; it is not inherently a passive protector. Solo combines leadership, fighting and resource decisions. Role duties are contextual, not a universal script.

For a bad tournament, identify poor decisions when evidence supports it, ask the player's explanation, and separate observation from inference. For good work, praise the specific action without empty reassurance or pressure. Sports discipline and serious intent matter, but the coach must not insult, shame or force the player. Check sleep, energy, mood and burnout when they affect the practical workload. Recovery belongs in training. Offer a specific drill or review task with a purpose, setup, decision to test, measurement and follow-up; no arbitrary «play pubs for 15 minutes». Custom games such as Noble may be useful, but suitability and current rules require checking.

Player-supplied Tracker/Osirion URLs, PR, earnings, events and results are evidence only when actually read or verified; never infer them from a nickname. The coach should be able to compare short clips (preferably with team voice) and, where technically possible, supported replay files. Ask for a short decision window, not an entire tournament, plus the player's own explanation. Voice audio is separate from a .replay file. Pro-player comparisons require comparable patch, mode, landing spot and circumstances; their result alone does not prove their decision was right. Current text chat has none of these automatic media or provider capabilities and must say so.

The coach needs a reviewed, source-linked knowledge base for Fortnite's competitive formats, season meta, official updates, tournament rules, training patterns, pro/coach insights and custom games. It must distinguish stable principles from patch-specific advice and retire stale entries when updates affect them. Player feedback may lead to reviewed improvements, not automatic training of model weights. Keep unaffected site features available during knowledge updates; do not close the entire site by default. The owner will review advice and terminology. Future ads and an owner Telegram link are optional later monetisation/community features, not inputs to the coach's verdict.

Current server prompt encodes the stable conversation rules above. It is not a substitute for the missing reviewed knowledge base, video/replay processing, verified statistics or longitudinal evaluation.

Sources: https://webllm.mlc.ai/docs/user/get_started.html ; https://webllm.mlc.ai/docs/user/basic_usage.html ; https://github.com/mlc-ai/web-llm/blob/v0.2.86/src/config.ts

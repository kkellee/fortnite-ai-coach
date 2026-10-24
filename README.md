# FORTNITE AI COACH — Fortnite practice coach

Russian-language first working version. Separate from PLAYER-SCAN (Dota).

## Run and test

Requires Node.js 20+. No npm dependencies, no API keys, no paid services enabled.

    npm test
    npm start

Open http://127.0.0.1:4173. `dist/` is a buildless static website.

## Implemented

Responsive landing page, four-step onboarding (mode, Build/Zero Build, Solo/Duo/Trio, role, focus, time), personalised rule-based practice plan, daily energy/sleep check-in, completion history, session journal, descriptive report from self-reported results, structured dialogue, local video/image preview, description of replay moments, manual PR/earnings/session entry, validated profile links, browser-local storage, JSON export/import and deletion. Accessibility: keyboard controls, labelled fields, native modal, live status, reduced motion.

## Not implemented — do not claim otherwise

LLM inference, automatic tactical analysis of clips/screenshots, voice transcription, .replay parsing, pro-VOD comparison, cloud accounts/sync/storage, automatic Osirion/Tracker stats, verified season-meta recommendations, automatic patch monitoring and maintenance mode. The UI discloses these limitations. There are no made-up PR, player scores or talent predictions. No payment or advertising is enabled.

The chat is a limited rule-based prototype, not a language model. Practice exercises are initial hypotheses requiring domain review, not validated coaching claims. Current seasonal advice stays disabled until source verification and expert review.

## Data

Only browser-local text is persisted. Selected media stays on the device and is not persisted/uploaded. Export contains personal text and should be kept private. Different devices/origins do not share state. Google Fonts is optional; system font fallback is available. No analytics.

## Publishing

`.openai/hosting.json` identifies the separate private Sites project. Use the Sites source workflow and deployment tools. Do not publish to or modify PLAYER-SCAN. A user GitHub repository is still pending because github.com browser access was explicitly blocked; do not bypass this restriction using alternate transports.

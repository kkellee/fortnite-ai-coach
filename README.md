# FORTNITE AI COACH — Fortnite practice coach

Russian-language first working version. Separate from PLAYER-SCAN (Dota).

## Run and test

Requires Node.js 20+. No local npm dependencies, API keys or paid services. AI uses pinned WebLLM 0.2.86 from jsDelivr and downloads model weights on explicit user action.

    npm test
    npm start

Open http://127.0.0.1:4173. `dist/` is a buildless static website.

## Implemented

Responsive landing page and onboarding with an optional general-improvement focus. Connected case workflow: evidence, contextual questions, player-authored practice action, outcome, linked journal. Daily energy/sleep check-in, manual statistics and profile links. Separate free-form AI chat uses Qwen3-4B through WebLLM in a dedicated worker, including profile/current-case text, bounded recent history, streaming, cancellation and real failure states. Requires WebGPU and sufficient device memory; first download is about 2.5 GB. No canned replies replace failed inference. Accessibility includes labelled forms, native modal and status reporting.

## Not implemented — do not claim otherwise

Automatic tactical analysis of clips/screenshots, voice transcription, .replay parsing, pro-VOD comparison, cloud accounts/sync/storage, automatic Osirion/Tracker stats, verified season-meta recommendations, automatic patch monitoring and maintenance mode. The UI discloses these limitations. No payment or advertising is enabled.

The AI is a small general language model, not a validated esports expert. It can make mistakes. Its system instruction prohibits inventing stats, claiming file access or asserting current meta. Guided case questions are separate from AI chat. Practice advice requires domain review. Device compatibility and response quality are not universal.

## Data

Text persists in localStorage and evidence in IndexedDB (3 files / 100 MB per case). JSON export contains text and file metadata, not file bytes. Files and chat are not uploaded for inference. Model code/weights are fetched from jsDelivr, Hugging Face and MLC's repository; weights are cached by the browser. Different devices/origins do not share state. Google Fonts is optional. No analytics.

## Publishing

`.github/workflows/pages.yml` publishes `dist/` through GitHub Pages on pushes to `main`. Enable GitHub Actions as the Pages source after pushing to a separate `fortnite-ai-coach` repository. `.openai/hosting.json` still identifies the existing Sites project; its public deployment stays independent. Do not modify PLAYER-SCAN. The browser AI model is experimental and has not been validated as a Fortnite coach.

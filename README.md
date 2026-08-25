# Real Cricket Career V9.0 — Complete Career + Match Update

## Included
- Preserves the existing V7/V8 UI, career screens, 3D stadium, camera system, fallback canvas, save/load and existing career data.
- Safe startup with a 15-second boot timeout and recovery mode.
- Realistic T20 match layer: pitch types, weather/conditions, batter/bowler matchup, form, fitness, pressure, shot risk, bowling variation and field settings.
- Four live field plans during the AI chase: Attack, Balanced, Defend and Death.
- AI batter personalities and weaknesses; AI changes shot selection using required run rate, wickets, form and weakness.
- Correct win/loss/tie logic and richer scorecard.
- Career World league table with points, W/L, NRR and simulated results for other clubs.
- Fixtures and season rollover.
- Transfer Hub with club offers, role, wage, signing bonus, contract length and market value.
- Contract history, squad role, morale and free-agent expiry behavior.
- Existing training, progression, reputation, fitness, injuries, news, rival, awards, selection and save compatibility preserved.

## Install / GitHub Pages
Replace the files in the repository with every file in this folder. No source-code editing is required.

## Save compatibility
The app continues to read the existing `rcc_career_v3` and `rcc_career_v2` local saves and automatically fills missing V9 fields.

## Important
Three.js is still loaded from the jsDelivr CDN because this is a static GitHub Pages project. Internet access is required for the 3D engine. If the engine fails, the safe 2D match view is used instead of leaving the game on an endless loading screen.

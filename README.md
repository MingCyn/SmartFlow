# SmartFlow

Flood early-warning prototype for township residents and operators. Hackathon build: everything runs on simulated data in the browser.

## Run

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and set `GROQ_API_KEY` (chatbot and photo depth AI). Open http://localhost:5173. Without a key the chat falls back to keyword answers and photo depth must be picked by hand.

The live camera and GPS need a secure origin: `localhost` works, and so does HTTPS. On a phone over plain `http://<LAN IP>`, the camera button falls back to the phone's own camera app. To try the installable PWA (manifest and service worker), run `npm run build && npm run preview`.

## Demo flow (5 steps)

1. **Report** (round camera button in the middle of the nav, `/report`). Take or choose a photo; the mock AI pre-fills the water depth. Allow location, or tap the map or pick a zone, then send. Note the report ID.
2. **Advice and chat** (`/advice`, `/chat`). Show the fixed advisory banner and the three life-critical lines, then the checklist, roads and safe point. In Chat, ask Titis the mascot about roads or tap "I need help now": Titis switches to its alert move and shows the fixed safety lines. Press Titis to make it play.
3. **My reports** (`/status`). Watch the new report move from Submitted to Unverified to Likely, and then to Verified, over about 90 seconds. Each status shows as both text and colour.
4. **Operations** (`/ops`, opens in the browser layout). Click a ranked zone to pan the map. Set a dispatch status. Drag the storm simulator to the top: Zone B1, a low-lying zone with no reports yet, climbs the ranking as its drain nears overflow.
5. **Settings** (`/settings`). Switch between Mobile app and Browser layout (instant, no reload, survives refresh), switch to Bahasa Malaysia, and turn on Reduce motion.

## Structure

| Path | What |
| --- | --- |
| `src/mocks/*.json` | Simulated data: 40 reports in 3 zones over 60 minutes, 6 zones with rainfall and drain series, safety data |
| `src/services/` | Thin service layer. All reads and writes go through `respond()` in `client.ts`; replace with `fetch` calls for a real API |
| `src/services/ai.ts` | Photo depth via Groq vision (`/api/flood-photo`), extra advice tips |
| `src/services/weather.ts`, `src/components/WeatherCard.tsx` | Live weather and 6-hour rain outlook from Open-Meteo, with a heavy-rain warning |
| `src/store/location.ts` | One shared GPS watch: live dot and locate button on every map, weather location, report pin |
| `src/constants/lifeCritical.ts` | Hard-coded, frozen life-critical lines and advisory banner. The AI layer cannot change them |
| `src/lib/scoring.ts` | Pure storm simulation and zone ranking |
| `src/store/` | Zustand stores: settings (layout, language, motion) and ops (storm, dispatch), persisted to localStorage |
| `src/components/AppShell.tsx` | The single shell for both layouts. Nav order: Operations, Advice, Report (round camera button), My reports, Chat. Settings is the gear in the header |
| `src/components/mascot/` | Titis, the chat mascot: 16 expressions and 15 moves as plain SVG and math (`poses.ts`), a frame loop with pointer-following gaze, blinking, press squish and napping (`engine.ts`) |
| `src/services/chat.ts` | Chatbot: Groq LLM grounded in safety data, your reports and live weather; keyword intents for mascot mood, links and offline fallback. Urgent messages show the frozen safety lines, never generated text |

## Layout modes

The layout is applied as `data-layout="mobile" | "browser"` on `<html>`. Tailwind custom variants (`mobile:` and `browser:`, defined in `src/index.css`) switch styles on the same components, so nothing is duplicated. Until a user picks a layout, residents' pages default to Mobile app and `/ops` defaults to Browser. The choice is stored in localStorage on the device (`smartflow-settings`).

## Prototype notes

- Mock people are "Resident A", "Resident B" and so on. Zone, road and safe point names are fictional. Map coordinates are only used to place the fictional grid.
- External calls: OpenStreetMap tiles and Open-Meteo weather (both cached by the service worker), and Groq through `/api/chat` and `/api/flood-photo`. The Groq routes run in the Vite dev/preview server (`server/groq.ts`) so the key never reaches the browser. A static host needs these two routes ported to its serverless functions.
- Danger messages in chat never reach the LLM; they always show the frozen lines from `src/constants/lifeCritical.ts`.
- Scoring: reports 35%, drain and rain sensors 50%, people affected 15%, plus an escalation as a drain passes 90% of capacity.
- Check the official contact numbers and links with the agencies before any real use.

# SmartFlow

Flood early-warning prototype for township residents and operators. Hackathon build: everything runs on simulated data in the browser.

## Run

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and set `GROQ_API_KEY` (chatbot and photo depth AI). Open http://localhost:5173. Without a key the chat falls back to keyword answers and photo depth must be picked by hand.

The live camera and GPS need a secure origin: `localhost` works, and so does HTTPS. On a phone over plain `http://<LAN IP>`, the camera button falls back to the phone's own camera app. To try the installable PWA (manifest and service worker), run `npm run build && npm run preview`.

## What is real vs simulated

| Part | Real or simulated |
| --- | --- |
| Live weather and 6-hour rain outlook | **Real.** Open-Meteo, free, no key |
| Your GPS position, live dot on maps | **Real.** Browser geolocation; only used on the device |
| Photo depth suggestion | **Real AI** (Groq vision) when `GROQ_API_KEY` is set. Without a key there is no suggestion and the resident picks the depth by hand |
| Titis chat answers | **Real AI** (Groq LLM) when the key is set, grounded only in the app's data; keyword answers otherwise. Danger messages never reach the AI |
| Life-critical safety lines and advisory banner | **Fixed text** in `src/constants/lifeCritical.ts`. Nothing generated can change them |
| Zones, population, drain and rain sensor readings | **Simulated** (`src/mocks/cells.json`). No real sensors |
| The 40 resident reports | **Simulated** (`src/mocks/reports.json`), timestamps shifted to "the last hour" on load |
| Your own reports and the verification pipeline (Submitted → Verified) | **Simulated**, sped up to about 90 seconds; stored only in this browser |
| Flooded areas on the map, flood alerts, "Which areas are flooded?" | **Simulated.** Zones are levelled from the ranking score; three fictional spots (underpass, riverside path, market car park) are placed around your GPS position, or the township centre without GPS. Every alert and map label says "Simulated" |
| System notifications | Real browser notifications, but they only carry the simulated alerts above |
| Storm simulator, dispatch status | **Demo controls** for operators |
| Road closures, safe points, zone and road names | **Fictional** (`src/mocks/safety.json`). Check official contacts with the agencies before any real use |
| Water supply page (`/outage`) | **Simulated** notice and tank levels |

## 5-minute demo video

**Before you record**

1. `npm run dev`, with `GROQ_API_KEY` in `.env` if you want the AI photo depth and chat prose.
2. Open `/ops` and press **Reset demo** (storm back to 50%, crews reset, added floods cleared).
3. Open **Settings**: allow location (so the fake floods appear near you) and press **Allow notifications**.

**Script (about 5 minutes)**

| Time | Screen | What to show |
| --- | --- | --- |
| 0:00 to 0:30 | Report | The problem: residents learn about street flooding too late, and operators get scattered calls. SmartFlow turns resident photos and drain sensors into advice and a ranked work list |
| 0:30 to 1:30 | Report | Take or choose a flood photo. The AI suggests the depth (labelled as a suggestion). The pin follows GPS, or tap the map. Send, and note the report ID. Under a minute |
| 1:30 to 2:00 | My reports | The report moves Submitted → Unverified → Likely → Verified, shown as text and colour |
| 2:00 to 3:00 | Operations | Ranked zones with sensor sparklines; flooded areas drawn on the map. Drag the storm slider to the top: the bell in the header shows a red count of new alerts, and Zone B1 climbs with no reports yet. Open the bell ("Severe flood alert ... Simulated") and tap **Show on map** to pan to it. Drag the slider back down: green "Water receding" alerts follow. Press **Add a flood near me** for one more live alert |
| 3:00 to 3:45 | Chat | Tap **Which areas are flooded?**: Titis lists the same areas as the map, nearest first, with distance and depth. Then tap **I need help now**: the fixed safety lines, never AI text |
| 3:45 to 4:15 | Advice, Settings | Roads to avoid, nearest safe point, go-bag checklist. Switch to Bahasa Malaysia; everything, including alerts, follows |
| 4:15 to 5:00 | Any | Real vs simulated (table above). Feasibility: a thin service layer (`src/services/client.ts`) swaps to a real API and sensor feed; zones are plain data, so another township is a new data file |

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
| `src/services/floods.ts`, `src/store/floods.ts` | Simulated flooded areas (zones from the ranking, plus fake spots around the user). One watcher in `AppShell` refreshes every 15 seconds, and at once when the storm, GPS or added floods change, and raises alerts when an area floods or gets worse |
| `src/components/FloodAlerts.tsx` | The header bell: count of new alerts and a list of recent flood and receding alerts with **Show on map**. A system notification also fires when allowed |
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

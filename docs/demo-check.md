# CrewSignal demo check — 2026-11-15

Real-browser verification of the handoff pipeline, run against the hardened
backend. Playwright drives installed Chrome (headless) with two isolated
persistent profiles; the script starts and stops its own backend and never
asserts a state it did not observe.

- Command: `cd frontend && npm run e2e:browser`
- Frontend: `http://localhost:3000` (dev server, `NEXT_PUBLIC_API_URL=http://localhost:4000`)
- Backend: `http://127.0.0.1:4000`, fresh `backend/data/e2e.db`,
  `DELAY_SCALE=0.01` (Mars transit = 12 s one-way)
- Profiles: crew profile and a separate ground profile (independent storage)
- Result: **18/18 checks passed**, no hydration or page errors

| # | Check | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Live link posts a handoff to the server | PASS | server states `["delivered"]`; outbox `["Delivered"]` (live delay is 0, so Sent and Delivered can land in the same second) |
| 2 | The server delivers the live packet without manual action | PASS | outbox showed `Delivered` |
| 3 | Blackout keeps the handoff Queued | PASS | outbox states `["Queued on board","Delivered"]` |
| 4 | Blackout stores nothing on the server | PASS | server packet count before=1, after=1 |
| 5 | Reloading during Queued keeps it Queued | PASS | after reload: `["Queued on board","Delivered"]` |
| 6 | Backend stopped for the unreachable case | PASS | `GET /health` refused |
| 7 | With the backend down, packets stay Queued and none are Sent | PASS | after 4 s: `["Queued on board","Queued on board","Delivered"]` |
| 8 | Backend restarts on the same database | PASS | `GET /health` returned 200 again |
| 9 | Link can be set to a 12 s Mars delay | PASS | `effectiveDelaySeconds=12` |
| 10 | Queued packets post after reconnect | PASS | outbox showed `Sent` after the backend returned |
| 11 | Delayed Mars packet becomes Delivered after the delay | PASS | outbox showed `Delivered` after 12 s |
| 12 | Server records match the outbox states | PASS | server states `["sent","sent","delivered"]` |
| 13 | Second browser profile receives the packet after delivery | PASS | ground inbox showed `Handoff · Alex Morgan` |
| 14 | Acknowledgement is stored by the server | PASS | 1 packet has `ackAt` |
| 15 | Crew outbox shows Acknowledged only after the return delay | PASS | after 12 s: `["Delivered","Delivered","Acknowledged by the flight surgeon"]` |
| 16 | Hydration and page errors during the run | PASS | no page or hydration errors captured |
| 17 | Crew UI sees the ground server separately from the simulated link | PASS | ribbon read `Ground server: reachable` |
| 18 | Fresh backend starts for the run | PASS | `GET /health` returned 200 |

## What this does not claim

- This is a headless Chrome run on the development machine, not a human pass on
  another device. Firefox/Safari and mobile layouts were not tested.
- Delays are compressed (`DELAY_SCALE=0.01`) for a walkthrough; the production
  scenario values are documented in the backend README.
- `/surgeon` uses a shared demo key stored in `sessionStorage`. It is a login
  prompt for a demo, not real authentication.
- The run used a fresh local database. It did not test concurrent writers or
  multiple backend instances.

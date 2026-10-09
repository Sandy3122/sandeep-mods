# Cctop: architecture

## Overview

Cctop keeps a `Model` of the session, built from the engine's own events and from `cctop query` calls to the external `cctop` program, and draws it as a docked `Pane` with seven views. A reducer in `model.ts` is the only place state changes; `pane.tsx` wires the hooks, `poller.ts` runs the queries and the marker file, and `views/` draws.

```
session / turn / tool events ─▶ reduce(model) ◀─ poller: cctop query <verb> (2 s busy, 10 s idle)
                                    │
                                    ├▶ Pane (ui.render): view bar + view
                                    ├▶ status line + toast (coach)
                                    └▶ ~/.cctop/pane/<session>.json (marker)
```

## Files

| File | Role |
| --- | --- |
| `hooks/hooks.json` | Points at `./pane.tsx` |
| `hooks/pane.tsx` | The hooks, `/cctop-pane`, pane open and close, render throttle, usage timer, coach actions |
| `hooks/model.ts` | `Model`, actions, reducer, query verbs, tested-with version |
| `hooks/poller.ts` | Query poller, verb discovery, session-id follower, marker writer |
| `hooks/views/index.ts` | Chooses the view to draw |
| `hooks/views/frame.tsx`, `table.tsx`, `format.ts` | Shared layout, tables and formatting |
| `hooks/views/overview.tsx`, `coach.tsx`, `tools.tsx`, `agents.tsx`, `files.tsx`, `events.tsx`, `advisor.tsx` | The seven views |
| `skills/cctop/SKILL.md` | `/cctop`: install check, pane status, terminal split fallback |
| `skills/cctop-insights/SKILL.md` | Tells Claude to answer from `cctop query` JSON |

## Events hooked

| Event (matcher) | What the hook does | Gating? |
| --- | --- | --- |
| `session.start` | Self-checks the engine surfaces, registers `/cctop-pane`, builds the poller, detects the binary, restores the pane | No |
| `turn.start` | Records the turn, starts the usage timer if open, follows the session id | No |
| `turn.complete` | Records the turn, stops the timer, reads usage once | No |
| `session.compact` | Records the compaction | No |
| `tool.call` | Times the call around `next(e)`; result passes through unchanged | Wraps the call, does not alter it |
| `command.run` (`cctop-pane`) | Toggles, opens on a view, or closes the pane | No |
| `skill.prompt` (`cctop`) | Opens the pane and replaces the skill prompt with a fixed reply | Rewrites the prompt |
| `ui.close` (`cctop`) | Stops timers and the poller, writes the closed marker | No |
| `ui.render` (`Pane`) | Builds the tree for the current view; a view error is drawn in one red line above the last good tree | No |

Every hook has a `.catch` that logs and falls through.

## Calls on $

| Call | Why |
| --- | --- |
| `$.command.register` | Adds `/cctop-pane` |
| `$.ui.open`, `$.ui.close`, `$.ui.invalidate`, `$.ui.resolve` | Open and close the pane, redraw (at most four a second), get components |
| `$.ui.status`, `$.ui.toast`, `$.ui.log` | Coach status line, NOW nudge toast, diagnostics |
| `$.clock.now`, `$.clock.every`, `$.clock.after` | Timestamps, poll and usage timers, render waits |
| `$.process.run` | `cctop --version`, `cctop query ...` |
| `$.fs.write` | Pane marker file |
| `$.fs.read` | Own `plugin.json`, for the version |
| `$.env.get` | `HOME` |
| `$.session.id`, `$.session.model`, `$.session.usage` | Session identity and token usage |
| `$.store.get`, `$.store.set` | Remember whether the pane was open and on which view |
| `$.prompt.fill` | Coach Fill button |

## State

- `$.state`: not used. The `Model` is a module variable, reset on each `register`.
- `$.store` (`pane`): `{ open, view }`.
- Files: `~/.cctop/pane/<session id>.json` (version, tested-with version, self-check result, session id, open and visibility state, heartbeat). The engine cannot delete files, so a reader treats `open: false` or a heartbeat older than 30 seconds as closed.

## Drawing

A `Pane` with request id `cctop`. Docked, it draws the view bar, the current view and notes for a missing binary, stale queries and unsupported verbs. Inline (the few rows above the prompt) it draws the header, Context and Limits only. The status line carries the coach's current suggestion and a hidden-pane notice. Toasts announce NOW nudges, at most one per turn.

## Settings flow

None. Poll intervals (2 s, 10 s), the 30 s stale limit and the 5 s query timeout are constants in `poller.ts`.

## Testing

No tests ship with this copy. The upstream project tests the model and views; they were not part of the imported plugin folder.

## Known limits

- Most numbers need the external `cctop` program; without it the pane shows only what the engine events provide.
- The pane is built against one Claude Code version (`TESTED_WITH` in `model.ts`) and reports a self-check problem when a surface moved.
- The `/diff` panel hides the docked pane; the status line says so.
- No tsconfig, types or tests in this folder.
- Never rename the plugin (`cctop`) or the marketplace (`sandeep-mods`).

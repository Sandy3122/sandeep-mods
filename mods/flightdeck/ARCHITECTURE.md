# Flightdeck: architecture

## Overview

Flightdeck listens to session events, folds each one into small `$.state` atoms with pure reducers, and draws them in a pane (docked or inline) and in the status line. It only observes: every hook passes its event on unchanged.

```
turn / tool / agent / session events ─▶ reducers (core.ts) ─▶ $.state atoms ─▶ Pane + status line
session.append (advisor tool calls)  ─▶ architect timeline
rail.tsx, elapsed.tsx                ─▶ surface modules: animated connectors and live clocks
```

## Files

| File | Role |
| --- | --- |
| `hooks/hooks.json` | Points at `./register.tsx` |
| `hooks/register.tsx` | Event hooks, state access, the `/flightdeck` command and one drawing function per panel |
| `hooks/core.ts` | Reducers, formatters, layout rules and `redact()` as pure functions |
| `hooks/rail.tsx` | Surface module: animated connectors, redrawn on the surface's frame clock |
| `hooks/elapsed.tsx` | Surface module: live clocks |
| `types/index.d.ts` | Types for the mod's `$.state` |
| `tests/flightdeck.test.ts` | Behaviour tests |
| `docs/media/` | Screenshots and demo GIF (`demo.gif` is used by the README; the others are upstream media) |
| `tsconfig.json` | Type-check config |

## Events hooked

| Event (matcher) | What the hook does | Gating? |
| --- | --- | --- |
| `session.start` | Registers `/flightdeck`, migrates older state and reads the first usage figures | No |
| `session.end` | On `/clear`, resets the pane and status line | No |
| `command.run` (`flightdeck`) | Opens, closes, resets or sets the layout | No |
| `classic.UserPromptSubmit` | Records the permission mode | Passes through |
| `agent.offer` | Remembers agent types that match the architect pattern | Passes through |
| `turn.start` | Starts the receipt; logs the first 70 characters of the prompt | No |
| `turn.step` | Updates the main box and per-agent steps and tokens | No |
| `session.measure` | Updates context, cost and rate limits | No |
| `session.compact` | Counts compactions | Passes through |
| `tool.check` | Records each permission verdict | Passes through |
| `tool.call` | Settles checks; logs edits and errors with credentials masked | Passes through |
| `session.append` | Reads advisor tool calls and a background architect's hand-back text | Passes through |
| `agent.spawn` | Creates an agent card | Passes through |
| `turn.complete` | Closes the turn and agent cards | No |
| `ui.render` (`Pane`, request `flightdeck`) | Draws the pane | No |

"Passes through" means the hook is on a gating event but always forwards the event unchanged. Validate reports these as gating hooks without `.catch`.

## Calls on $

| Call | Why |
| --- | --- |
| `$.state.get`, `$.state.set` | Read and write the panel atoms |
| `$.session.usage` | Context, cost and rate-limit readings |
| `$.ui.open`, `$.ui.close`, `$.ui.resolve` | Open and close the pane; resolve its components |
| `$.ui.status` | Status line entry |
| `$.command.register` | `/flightdeck` |
| `$.clock.now` | Timestamps |

## State

- `$.state` (`flightdeck.*`): `meta`, `main`, `usage`, `architect`, `gate`, `agents`, `loops`, `log`, `turn`, `receipt`, `view`, `roster`. Reads are merged over defaults, so a missing or older field does not break the pane; a change to a state's shape may reset counters once.
- `$.store`: not used. Nothing is kept across sessions.
- Files: none are read or written.

## Drawing

A `Pane` (docked beside the transcript in fullscreen terminals, two columns from 110 columns; inline above the prompt as a summary of at most 8 rows on the main screen), plus a status line entry and two surface modules for animated connectors and clocks. The desktop app, VS Code and mobile draw the same panels with agents on an SVG time axis; VS Code and mobile can't animate.

## Settings flow

`userConfig` options in `plugin.json` are read in `register.tsx` and normalised into one config object; invalid values fall back to defaults. `/flightdeck layout` overrides `layout` for the session.

## Testing

`tests/flightdeck.test.ts` covers the reducers and layout rules directly, the permission gate, and drawings mounted on every surface at 40 to 120 columns. Run `claude plugin test mods/flightdeck`.

## Known limits

- Architect moments are inferred and labelled so. A server tool's advice is encrypted, so only the consult is shown.
- Per-agent context is the latest request's whole input, not a cost: the API has no per-agent cost.
- Workflow agents and compaction forks look the same in the loops panel.
- A background agent's first step can arrive before its card exists, so its usage may show one step late.
- Maintainer rules from upstream: every number must come from a session event (label anything inferred); never deny, rewrite or delay an event; anything stored from a tool input goes through `redact()` first; check drawing changes at 40, 64 and 120 columns. Report a credential format that `redact()` misses privately to the maintainer, not in a public issue.
- Never rename the plugin (`flightdeck`) or the marketplace (`sandeep-mods`); existing installs and the `$.state` keys use those names.

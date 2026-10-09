# PR Pulse: architecture

## Overview

PR Pulse polls GitHub through `gh`, keeps the result in `$.state`, and draws it in three panes and a one-line band above the prompt. A timer started by `/pulse` runs a refresh every 15 seconds; slower data (history, review queue, branch status, check extras) refreshes every 60 seconds.

```
/pulse ─▶ start ─▶ $.clock.every(15s) ─▶ gh calls ($.process.run) ─▶ $.state
                                                                  ─▶ alerts ($.ui.toast, alerts list)
$.state ─▶ Pane (PR Pulse, history, reviews) / AbovePrompt band (minimised)
buttons ─▶ refresh, minimise, expand, close, open PR, draft prompt
```

## Files

| File | Role |
| --- | --- |
| `hooks/hooks.json` | Points at `./register.tsx` |
| `hooks/register.tsx` | Polling, readiness logic, alerts, panes and band |
| `hooks/register.test.ts` | Behaviour tests with a faked `gh` |
| `types/index.d.ts` | Types for the mod's `$.state` |
| `assets/pr-pulse.png` | Screenshot used by the README |

## Events hooked

| Event (matcher) | What the hook does | Gating? |
| --- | --- | --- |
| `session.start` | Registers `/pulse` and resumes watching if state says so | No |
| `classic.CwdChanged` | Follows the new folder's repo | No |
| `command.run` (`pulse`) | Starts watching, or expands or refreshes if already running | Answers the command |
| `ui.close` | Stops polling when you close the PR Pulse pane | No |
| `ui.render` (`AbovePrompt`) | Draws the minimised band | No |
| `ui.render` (`Pane`, `pr-pulse`) | Draws the main pane | No |
| `ui.render` (`Pane`, `pr-pulse-history`) | Draws PR history | No |
| `ui.render` (`Pane`, `pr-pulse-reviews`) | Draws the review queue | No |

## Calls on $

| Call | Why |
| --- | --- |
| `$.process.run` | `gh`, `git rev-parse`, `uname`, `open` or `xdg-open` |
| `$.clock.every` | The 15 second poll |
| `$.command.register` | Adds `/pulse` |
| `$.config.list` | Reads the Claude Code `theme` for dark or light colours |
| `$.state.get`, `$.state.set` | All watched data |
| `$.ui.open`, `$.ui.close` | Opens and closes the panes |
| `$.ui.resolve` | Gets `Box`, `Text` and `Button` for drawing |
| `$.ui.status`, `$.ui.toast`, `$.ui.log` | Status line, alerts, debug log |
| `$.prompt.read`, `$.prompt.fill` | Appends a draft to the prompt box; never submits |

## State

- `$.state` (`pr-pulse.*`): `pr`, `error`, `loadedAt`, `view`, `steps`, `failedLog`, `repo`, `openPrs`, `history`, `teamMerged`, `reviews`, `selected`, `threads`, `conversation`, `commentsLoaded`, `watching`, `target`, `repoCache`, `alerts`, `collapsed`.
- `$.store`: none.
- Files: none. The poll timer, last-seen data used to detect changes, and the browser opener name are module variables.

## Drawing

Three panes (main, history, reviews) opened together, and the `AbovePrompt` band when minimised, skipped while a survey shows. Terminal and desktop surfaces.

## Settings flow

There are no options. The only config read is Claude Code's `theme`, through `$.config.list`.

## Testing

`hooks/register.test.ts` fakes `gh` with a mutable world, so tests change a PR between refreshes to check readiness verdicts, alerts and drill-down. A capability guard test fails if the mod runs a program outside `gh`, `git`, `uname` and `open` or `xdg-open`. Run `claude plugin test mods/pr-pulse`.

## Known limits

- Uses polling, so changes show up to 15 seconds late (60 for slow data).
- All GitHub calls are serial and share your `gh` token's rate limits.
- Helpers that take `$` must be top-level functions; the engine rejects passing `$` elsewhere. Never name a local variable `on`.
- Keep the reach small: only `gh`, `git`, `uname` and `open` or `xdg-open`, only `https://` links, no files written, no model calls, no `$.prompt.submit`.
- Colours come from the `theme` object; button labels go in the `label` prop.
- Never rename the plugin (`pr-pulse`) or the marketplace (`sandeep-mods`); existing installs and the `$.state` keys use those names.

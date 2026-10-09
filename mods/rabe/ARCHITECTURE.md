# Rabe: architecture

## Overview

Rabe turns hook events and undocumented files into a list of items, keeps the list in `$.state`, and draws it in a band above the prompt and a pane. It has four parts: sources, the registry, the band and pane, and `register.tsx`, which only connects them. A longer description is in `docs/architecture.md`.

```
hooks (tool.call, agent.spawn, turn.step, task notifications) ─┐
files (agent meta, shell output, Codex jobs and sessions)  ────┼▶ sources ▶ registry ▶ $.state rabe.items
cron tools (CronList), timers                              ────┘
$.state ▶ AbovePrompt band, /rabe pane (Items, Cost, Effects, Timeline)
session.end ▶ $.store previous:<cwd> summary
```

## Files

| File | Role |
| --- | --- |
| `hooks/hooks.json` | Points at `./register.tsx` |
| `hooks/register.tsx` | Entry point: calls `sources(on)`, `band(on)`, `pane(on)` and, unless `hideBuiltinTasks` is off, `builtin(on)` |
| `hooks/model.ts`, `hooks/registry.ts` | Item types and helpers; pure list changes (`addItem`, `updateItem`, `endItem`, `capEnded`) |
| `hooks/sources/index.ts` | `Source` type and `sources(on)` |
| `hooks/sources/{agents,workflows,codex,shells,monitors,crons}.ts` | One source per kind of item |
| `hooks/tasks.ts`, `hooks/schedule.ts` | Pure parsers for task notifications and output files; cron next runs |
| `hooks/testing.ts` | Test helpers (`memoryState`, `files`, `core`) |
| `hooks/ui/band.tsx`, `pane.tsx`, `builtin.tsx` | The only UI files that touch `$` |
| `hooks/ui/render.tsx`, `view.ts`, `views/`, `cells/` | Pure views return a cell grid and buttons; one renderer draws them as a raster or as text |
| `hooks/ui/{facts,format,lists,fixtures}.ts` | Pure helpers and test fixtures |
| `hooks/*.test.ts(x)`, `hooks/**/*.test.ts(x)` | Tests, next to the code |
| `types/index.d.ts` | The `$.state` keys and item types |
| `types/claude-code.d.ts` | API types written by Claude Code; replace, don't edit |
| `commands/report-bug.md`, `commands/feedback.md` | `/rabe:report-bug` and `/rabe:feedback` |
| `docs/architecture.md`, `docs/feasibility.md` | The original design notes and the list of data sources and their limits. `docs/assets/` holds the README demo and banners. |
| `tsconfig.json` | Own compiler options (JSX with `h`/`Fragment`); includes `types` and `hooks` |

## Events hooked

| Event (matcher) | What the hook does | Gating? |
| --- | --- | --- |
| `session.start` | Loads the agent list, previous-session summary, polls files | No |
| `agent.spawn`, `classic.SubagentStart` | Adds a subagent item | Yes (passes on) |
| `turn.step`, `turn.complete` (`agentId`) | Updates agent tokens and turns | No |
| `tool.call` (`Edit\|Write`) | Records files an agent touched | Yes (passes on) |
| `tool.call` (`Workflow`, `Bash`, `Monitor`) | Adds workflow, shell and monitor items | Yes (passes on) |
| `tool.call` (`CronCreate`, `CronDelete`, `ScheduleWakeup`) | Tracks cron jobs and wakeups | Yes (passes on) |
| `prompt.submit` (task notification, scheduled trigger) | Ends items, advances cron jobs | Yes (passes on) |
| `classic.Stop` | Final poll of shell, monitor and cron output | Yes (passes on) |
| `command.run` (`rabe`, `rabe-stop`) | Opens the pane; cancels a Codex job | No |
| `ui.render` (`AbovePrompt`) and pane renders | Draw the band and pane | No |
| `ui.focus` (`requestId=rabe`) | Keeps focus on the pane | Yes (passes on) |
| `session.end` | Stores a summary for the next session | No |

Each hook in a source needs a matcher: an event may have only one hook without a matcher in the whole module, and `pane.tsx` owns the plain `session.start`.

## Calls on $

| Call | Why |
| --- | --- |
| `$.agent.list` | Agents running before the mod loaded |
| `$.fs.list`, `.read`, `.stat` | Agent meta, shell and monitor output, Codex job and session files |
| `$.process.run` | `tail` for large files; `node` to run the Codex cancel script |
| `$.env.get` | `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `HOME` |
| `$.tool.call` | `TaskStop`, `CronList`, `CronDelete` |
| `$.command.register`, `$.command.run` | `/rabe`, `/rabe-stop` |
| `$.session.cwd`, `.id`, `.usage`, `.send` | Project key, ids, cost, message to an agent |
| `$.state.get`, `.set` | The items and view state |
| `$.store.get`, `.set` | Previous-session summary |
| `$.clock.now`, `.every`, `.after` | Timestamps, polling, deferred work |
| `$.ui.open`, `.panes`, `.focus`, `.invalidate`, `.resolve`, `.copy`, `.toast` | Pane, redraws, copy, toasts |

## State

- `$.state` (`rabe.*`): `items`, `tab`, `turns`, `lines`, `query`, `folded`, `selected`, `open`.
- `$.store`: `previous:<cwd>`, one summary per project (counts per kind, tokens, cost, names of failed items).
- Files on disk: none written.

## Drawing

The `AbovePrompt` band and a `Pane` opened by `/rabe`. The terminal draws a raster with colors; the desktop app gets text and buttons. Only `band.tsx`, `pane.tsx` and `builtin.tsx` touch `$`; views are pure functions.

## Settings flow

`hideBuiltinTasks` is read in `register.tsx`; when it is not `false`, `builtin(on)` is registered to strip Claude Code's own background count. A change applies after a restart.

## Testing

Tests sit next to the code and cover the registry, each source, the parsers, every view, and the band and pane on terminal and desktop. Run `claude plugin test mods/rabe` (242 tests). A test's `$` has no `state` noun: watch writes with a test hook on `state.set`, and use `mock.clock(on)` when code reads the clock.

## Known limits

- Rabe reads undocumented Claude Code and Codex files; a changed layout shows `n/a`.
- No dollars per agent: no source gives them.
- Shell ports are guessed from output.
- Not visible: Codex jobs started outside the Codex plugin, deleted Codex sessions, retries inside a workflow.
- Rules from the original project for further work:
  - Pass events on with `next(e)` unless answering on purpose; never throw from a hook.
  - Helpers that take `$` are top-level functions in the same file as the hook, and `$.state` references are written with literal `plugin: 'rabe'` and `key` in the file that uses them. The validator refuses closures that receive `$` and does not follow `$` across imports.
  - `$.fs` rejects reads over 4 MiB; use `tail` through `$.process.run`.
  - Module variables reset on reload: keep session values in `$.state`, cross-session values in `$.store`. Poll with `$.clock.every` and write state only on change.
  - Keys are focusable Buttons and lowercase letter hotkeys; raster cells take width-1 BMP characters only (`safe()` replaces the rest).
  - A new data source goes into `docs/feasibility.md`.
- Never rename the plugin (`rabe`) or the marketplace (`sandeep-mods`); existing installs and the `$.state` keys use those names.

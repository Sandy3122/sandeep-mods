# Rabe: architecture

## Overview

Rabe turns hook events and undocumented files into a list of items, keeps the list in `$.state`, and draws it in a band above the prompt and a pane. It has four parts: sources, the registry, the band and pane, and `register.tsx`, which only connects them.

```
hooks (tool.call, agent.spawn, turn.step, task notifications) ─┐
files (agent meta, shell output, Codex jobs and sessions)  ────┼▶ sources ▶ registry ▶ $.state rabe.items
cron tools (CronList), timers                              ────┘
$.state ▶ AbovePrompt band, /rabe pane (Items, Cost, Effects, Timeline)
session.end ▶ $.store previous:<cwd> summary
```

### Data sources

Rabe uses three kinds of source, in this order: the mod API (hooks and calls on `$`, documented), files that Claude Code and Codex write while they work (undocumented, can change in any release), and the Claude Code or Codex source code when the first two do not say enough. Read files defensively: a missing file or field shows as `n/a`, never as an error.

- The API has no call that lists running background tasks. Rabe keeps its own list: an item is added when a hook reports a start and closed by a task notification or result, and `classic.Stop` (`background_tasks`, `session_crons`) corrects it. Work that started before Rabe loaded shows only what `$.agent.list()`, `CronList` and the files on disk tell.
- Subagents: `$.agent.list()`, `agent.spawn`, `turn.step` (tokens, tool calls) and `turn.complete`; worktree, branch and phase from `subagents/agent-<id>.meta.json`, which is written about 1.5 s after the start and rewritten later. Workflow agents are not in the agent list and cannot be stopped one by one; a retried workflow agent raises no new `agent.spawn`.
- Workflows: the Workflow tool result and the script's `meta.phases`; the run ends with a task notification.
- Shells and monitors: the Bash or Monitor tool result gives the task id and output file (`/tmp/claude-<uid>/<project>/<session>/tasks/<taskId>.output`, which ends with `[exited with code N]` or `[killed]`). A Monitor task runs as a shell task in `background_tasks`.
- Cron jobs: `CronCreate` input and result, `CronList` for older jobs, `ScheduleWakeup` for loop wakeups. Next runs are computed in `hooks/schedule.ts`; Claude Code adds jitter, so they are estimates.
- Codex jobs: the Codex plugin's `state.json` and `jobs/<id>.json` under its data folder, and Codex's own session file for model, effort and tokens. Cancel runs `codex-companion.mjs cancel` with `CLAUDE_PLUGIN_DATA` set, or the script finds no job. Codex deletes old session files, so older jobs show `n/a`.
- Cost: `$.session.usage().cost.usd` is the session total. No source gives dollars per agent.
- Task notifications arrive as `prompt.submit` with origin kind `task-notification`; their text format is not documented.

### The engine's rule for `$`

`claude plugin validate` and `claude plugin test` follow `$` only into functions declared in the same file. A module that passes `$` to an imported function, to an object's method or to a function held in a list is refused, and a state reference must be written in the file that uses it. So shared code is pure (`model.ts`, `registry.ts`), each file that writes items has its own small write loop, `sources(on)` calls each source by name, and a source gets `on` only.

An event may have only one hook without a matcher in the whole module. Sources give each hook a matcher, also when it has to match every event (`{ cwd: /^/ }` on `session.start`, `{ agentId: /^/ }` on `turn.step`, `{ stop_hook_active: [true, false] }` on `classic.Stop`).

The write loop reads `rabe.items` with its version, applies the change, and sets it again when another hook wrote first; it writes only when the list changed. A `$.state.set` made in a `$.clock.every` or `$.clock.after` callback does not pass the plugin's own `state.set` hooks, so Rabe never reacts to its own writes in a hook.

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
| `assets/` | The README demo GIF and banners |
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

The `AbovePrompt` band and a `Pane` opened by `/rabe`. The terminal draws a raster with colors; the desktop app gets text and buttons (choose by `e.surface === 'terminal'`, not by checking for `Raster`). Only `band.tsx`, `pane.tsx` and `builtin.tsx` touch `$`; views are pure functions.

- A raster is a fixed grid (1 to 512 columns, 1 to 256 rows) of width-1 BMP characters; the engine refuses the tree otherwise. Size every grid from `bodyColumns` and `scroll.bodyRows` on each draw: a grid wider than the body is cut on the right. `$.ui.blit` is refused after a size change, so blit only between resizes.
- Nothing holds focus when the pane opens. Give a Button `autoFocus`, or call `$.ui.focus` right after the open. `$.ui.open({ focus: true })` inside `command.run` does not focus the pane; `pane.tsx` opens it again from `$.clock.after(1500)`, only while `$.ui.panes()` still lists it. `closeOnEscape` makes Esc close the pane.
- Hotkeys are one digit or lowercase letter; Shift is ignored. Space, `/` and the arrow keys cannot be bindings. A letter no Button binds sends the focus to the prompt, and no hook can keep the keys, so the hint under each tab names the bound keys.
- A tree draws at most 100,000 characters: draw the visible part and use `$.ui.scroll`.

## Settings flow

`hideBuiltinTasks` is read in `register.tsx`; when it is not `false`, `builtin(on)` is registered to strip Claude Code's own background count. A change applies after a restart.

## Testing

Tests sit next to the code and cover the registry, each source, the parsers, every view, and the band and pane on terminal and desktop. Run `claude plugin test mods/rabe` (242 tests). A test's `$` has no `state` noun: watch writes with a test hook on `state.set`, and use `mock.clock(on)` when code reads the clock.

## Known limits

- The agent list under the prompt cannot be hidden by a mod. `disableAgentView` hides it but also turns off agent view, `claude agents`, `--bg` and the daemon, so Rabe does not use it.
- Hiding the built-in count removes only the task part of the `PromptHint` and cannot drop the "still running" part of the `TurnDuration` line without drawing the whole line, so Rabe draws its own.
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
  - Document a new data source in the Data sources list above.
- Never rename the plugin (`rabe`) or the marketplace (`sandeep-mods`); existing installs and the `$.state` keys use those names.

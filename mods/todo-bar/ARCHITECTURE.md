# Todo Bar: architecture

## Overview

Todo Bar reads the calls Claude already makes (`TodoWrite`, `TaskCreate`, `TaskUpdate`) after they run, builds a board of tasks in `$.state`, and draws it in the band above the prompt. Subagents the main thread starts are tracked as rows. Nothing is sent to a model and no tool is registered.

```
tool.call (after it ran) ─▶ board.ts builders ─▶ $.state board ─▶ $.store board:<session>
agent.spawn / tool.call / turn.complete ─▶ $.state agents
30 s timer ─▶ $.state tick
AbovePrompt render ◀─ board, agents, tick, isHidden, isPicking
```

## Files

| File | Role |
| --- | --- |
| `hooks/hooks.json` | Points at `./register.tsx` |
| `hooks/register.tsx` | The hooks, the `/todos` command, saving the board and drawing the band |
| `hooks/board.ts` | Pure helpers: build the board from each call, progress, the bar, durations |
| `hooks/config.ts` | Reads `userConfig` into a typed `Config` |
| `hooks/i18n.ts` | Messages in the supported languages |
| `hooks/kit/` | Shared helpers: language resolution, option readers, band stacking, `/config` writes |
| `types/index.d.ts` | Types for the mod's `$.state` |
| `tests/todo-bar.test.tsx` | Behaviour tests |
| `assets/preview.png`, `assets/done.png` | Screenshots used by the README |
| `README.zh.md` | The original Chinese README, kept as a translation |

## Events hooked

| Event (matcher) | What the hook does | Gating? |
| --- | --- | --- |
| `session.start` | Resolves the language, registers `/todos`, sets hidden from `visible`, restores a saved board, starts the 30-second timer | No |
| `agent.spawn` | Adds a subagent row for a main-thread subagent and counts it on the running task | No (passes through) |
| `turn.complete` | Removes a subagent's row when its turn ends; at the main turn's end, drops rows for agents no longer running | No |
| `tool.call` | Subagent calls name the tool on its row. Main-thread `TodoWrite`, `TaskCreate` and `TaskUpdate` update the board after they ran; other tools count toward the running task | No (passes through; never denies) |
| `command.run` (`todos`) | Lists the tasks, or sets `visible` with `off` / `on` | No |
| `prompt.edit` | Tracks whether a `/` or `@` picker is open | No (passes through) |
| `prompt.submit` | Clears the picker flag | No (passes through) |
| `ui.render` (`AbovePrompt`) | Draws the band | No |

## Calls on $

| Call | Why |
| --- | --- |
| `$.settings.read`, `$.env.get` | Claude Code's `language` setting; `LC_ALL`, `LC_MESSAGES`, `LANG` |
| `$.command.register` | `/todos` |
| `$.state.get`, `$.state.set` (via `atom`, `read`, `update`) | Board, hidden flag, picker flag, subagent rows, tick |
| `$.store.get`, `.set`, `.delete`, `.keys` | Keeps each session's board; prunes old sessions |
| `$.session.id` | Names the store key |
| `$.agent.list` | Finds which subagents still run |
| `$.clock.now`, `.every`, `.after` | Timestamps, the 30-second redraw, folding a finished band after 8 seconds |
| `$.config.set` | Writes `todo-bar.visible` for `/todos off` and `on` |
| `$.ui.resolve` | Gets the `Box` and `Text` components to draw with |

## State

- `$.state` (`todo-bar.*`): `board` (source, items, start, done time, folded flag), `isHidden`, `isPicking`, `tick`, `agents`.
- `$.store`: `board:<session id>` for the newest 20 sessions, so a resumed session finds its board. A finished board is restored folded.
- Files on disk: none written by the mod. `$.config.set` writes the `visible` option through Claude Code.

## Drawing

One band in the `AbovePrompt` site. It shows the running task, a bar and count, up to three subagent rows (the rest are counted on one row), and a dim row of next tasks. A finished list shows the time it took and folds after 8 seconds. The band is not drawn when hidden, folded, while a picker is open, or when the survey is showing.

## Settings flow

`readConfig(options)` in `hooks/config.ts` reads `visible`, `showNext`, `showAgents`, `slowMinutes` and `language` once when the hooks register, using the kit's option readers. `/todos off` and `on` write `visible` back through `$.config.set`.

## Testing

`tests/todo-bar.test.tsx` covers the board builders and the band. Run `claude plugin test mods/todo-bar`.

## Known limits

- Draws only in the `AbovePrompt` site.
- Reads only the main thread's list; a subagent's own list is left out.
- `claude plugin validate` notes that the `agent.spawn`, `tool.call` and `prompt.submit` hooks have no `.catch`; they only pass events through or write state.
- Never rename the plugin (`todo-bar`); existing installs and the `$.state` keys use that name.

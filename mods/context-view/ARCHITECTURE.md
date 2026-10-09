# Context View: architecture

## Overview

Context View keeps two readings in `$.state`: the window (size, auto-compact threshold, reserve) and the fill (tokens used, percent, estimate flag). Hooks on session, turn, compaction, model and config events take a new reading when the window moves, and a two-second timer compares the engine's live figures with the stored reading. An `AbovePrompt` renderer draws the row from the stored readings. Every hook except its own command and the band passes its event on unchanged.

```
session / turn / compact / model / config / clear events ─▶ next(e) ─▶ $.session.usage ─▶ $.state window + fill
clock.every (2 s) ─▶ $.session.usage ─▶ $.state (only if changed)
/context-view ─▶ $.state isHidden + $.store isHidden
$.state ─▶ ui.render AbovePrompt ─▶ meter row
```

## Files

| File | Role |
| --- | --- |
| `hooks/hooks.json` | Points at `./register.ts` |
| `hooks/register.ts` | The hooks, the readings, the timers and the `/context-view` command |
| `hooks/index.ts` | Re-exports the parts as namespaces |
| `hooks/command/` | Parses the `/context-view` argument into hide or show |
| `hooks/glyphs/` | Meter marks, separator, gap and estimate mark for the terminal (Ghostty uses `█` and `░`) |
| `hooks/levels/` | Warning and error levels, their theme colours, and the headroom |
| `hooks/limits/` | Constants: band inset, bar widths, cell shares, reserve sizes, recheck and settle delays |
| `hooks/message-of/` | Turns a thrown value into text |
| `hooks/meter/` | Builds the runs of cells for the meter |
| `hooks/names/` | All strings: command text, status words, debug messages, the store key |
| `hooks/readings/` | Fill, window, percent and token calculations, and the checks for an outdated reading or a loop total |
| `hooks/views/` | The band, bar and segments, fitting them to the width, and count formatting |
| `types/index.d.ts` | Types for the mod's `$.state` |
| `tests/` | One test file per source file under `hooks/`, plus `register.test.ts` and shared `fixtures/` |

## Events hooked

| Event (matcher) | What the hook does | Gating? |
| --- | --- | --- |
| `session.start` | Registers `/context-view`; once up, detects the terminal's marks, copies the stored choice, takes the first reading, starts the two-second check | No |
| `classic.SessionStart` (`clear`, `resume`, `fork`) | Passes the event on, copies the choice again and takes a reading; reads again after a resume | Yes (passes on with `next(e)`) |
| `classic.PostModelSwitch` | Passes the event on, then reads the new model's window | Yes (passes on) |
| `session.measure` | After a main-thread turn whose context moved, takes a reading from the pushed figures | No |
| `turn.step` | After each request of the main loop, sets the fill from the request's input tokens; for a request with an API-run tool such as the advisor, reads the engine's own figure instead | No |
| `session.compact` (`manual`, `auto`, `plugin`) | Passes the event on, then reads the window once the engine has landed the compaction | Yes (passes on) |
| `config.set` (`autoCompact`) | Passes the change on, then reads the window | Yes (passes on) |
| `command.run` (`clear`, `resume`, `branch`) | Passes the command on, then copies the choice and reads the window | Yes (passes on) |
| `command.run` (`autocompact`, `model`) | Passes the command on, then reads the window | Yes (passes on) |
| `command.run` (`context-view`) | Hides or shows the row, saves the choice, and says which | No |
| `ui.render` (`AbovePrompt`) | Draws the row; passes while a survey holds the band, while hidden, or with nothing to draw | No |

The hooks marked as passing on never skip, rewrite or answer the event; they return what Claude Code answered.

## Calls on $

| Call | Why |
| --- | --- |
| `$.command.register` | Adds `/context-view` |
| `$.session.usage` | Reads the context figures; with `breakdown: 'summary'` (estimated locally) for the threshold and reserve, falling back to the plain figures |
| `$.state.get`, `$.state.set` | Keep the window, fill and hidden flag |
| `$.store.get`, `$.store.set` | Keep the hidden choice across sessions |
| `$.env.get` | Reads `TERM` and `TERM_PROGRAM` once per load to detect Ghostty |
| `$.clock.every` | The two-second check of the live figures |
| `$.clock.after` | Re-reads a tenth of a second after a change, and twice more, for changes the engine lands late |
| `$.ui.log` | Failures to the debug log only |
| `$.ui.resolve` | Gets the components used to draw the row |

## State

- `$.state` (`context-view.window`): size, auto-compact limit, buffer and auto-compact flag, or `null`.
- `$.state` (`context-view.fill`): tokens, percent, estimate flag and optional output tokens, or `null`.
- `$.state` (`context-view.isHidden`): whether the row is hidden.
- `$.store` (`isHidden`): the hide or show choice, kept across sessions.
- Files: none.

## Drawing

One row in the `AbovePrompt` band, starting at the prompt's text column and running to the end of the columns the band gets. The meter steps down from 20 cells to 12 and 8 as the band narrows; then the headroom, then the tokens drop out; the percentage stays. Colours are theme keys (`permission`, `warning`, `error` and the dim text's), so the row follows every theme. Ghostty gets `█` and `░` cells. Other mods' content in the band stays below the row.

## Settings flow

None. The thresholds, widths and delays are constants under `hooks/limits/`.

## Testing

Each test file covers the source file of its name under `hooks/`. `tests/register.test.ts` drives the module through session events (start, estimate, measurements, turn requests, advisor requests, late figures, `/clear`, resume, branch, compactions, model switches, `/config`, `/autocompact`, rewinds, `/context-view` and its words, surveys, other mods' notes, the built-in guard, failed readings, Ghostty) on the terminal and desktop surfaces. `tests/views/band.test.ts` reads the drawn row at each width and level. Run `claude plugin test mods/context-view`.

## Known limits

- Where Claude Code's built-in guard runs (managed settings, Team or Enterprise plans), `classic.*` events do not reach an installed mod. The row follows `/clear`, `/resume`, `/branch` and `/model` through the commands, and the two-second check covers the rest.
- A change to `autoCompactEnabled` made by editing a settings file shows after the next turn.
- If no breakdown answers, a 33k reserve stands in for the threshold.
- A store that cannot be read back leaves the row as it was.
- The `tsconfig.json` is the original's own and does not use the shared `extends` form, because its `include` covers `.claude-plugin/types`, `hooks`, `types` and `tests`.
- Never rename the plugin (`context-view`) or the marketplace (`sandeep-mods`); existing installs and the `$.state` keys use those names.

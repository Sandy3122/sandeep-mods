# Blast Radius: architecture

## Overview

Blast Radius intercepts Bash tool calls, classifies the command, measures what it would touch with read-only commands, and holds the call until you press a button. The held command lives in `$.state`; the pane and the band both draw from it.

```
tool.call Bash ─▶ classify ─▶ measure ($.process.run) ─▶ $.state held
                                                        ─▶ Pane / AbovePrompt (Cancel, Proceed)
button press ─▶ decisions map ─▶ hook loop ─▶ next(e) (run) or { deny }
```

## Files

| File | Role |
| --- | --- |
| `hooks/hooks.json` | Points at `./register.tsx` |
| `hooks/register.tsx` | The hook, the classifier, the preview and the panel |
| `types/index.d.ts` | Types for the mod's `$.state` |
| `tests/blast-radius.test.tsx` | Behaviour tests |

## Events hooked

| Event (matcher) | What the hook does | Gating? |
| --- | --- | --- |
| `tool.call` (`Bash`) | Classifies the command; holds risky ones until Cancel, Proceed or timeout | Yes (deny) |
| `ui.render` (`Pane`, request `blast-radius`) | Draws the held command in the pane | No |
| `ui.render` (`AbovePrompt`) | Draws it in the band when the pane did not fit | No |

## Calls on $

| Call | Why |
| --- | --- |
| `$.session.surfaces` | Detects a session with no screen and denies at once |
| `$.process.run` | Preview commands (`bash`, `git`) and a `sleep 0.25` poll |
| `$.env.get` | Reads `HOME` to expand `~` and `$HOME` |
| `$.state.get`, `$.state.set` | The held command, through the `held` atom |
| `$.ui.open`, `$.ui.close` | Opens and closes the Blast Radius pane |
| `$.ui.resolve` | Gets `Box`, `Text` and `Button` for drawing |
| `$.clock.now` | Deadline and countdown for the timeout |

## State

- `$.state` (`blast-radius.held`): the held command (`id`, `command`, `risk`, `summary`, `details`, `where`, `secondsLeft`) or `null`.
- `$.store`: none.
- Files: none. Button presses are kept in an in-memory map for the life of the process.

## Drawing

A focused pane titled Blast Radius; when `$.ui.open` reports it is not placed (narrow window), the same panel is drawn in the `AbovePrompt` band, limited to five detail lines, and skipped while a survey is showing. Both are terminal and desktop surfaces.

## Settings flow

`timeoutSeconds` arrives in `options` and is normalised by `timeoutFrom`: numbers and numeric strings are accepted, fractions round up, and invalid or negative values fall back to 60. `0` means no timeout. It is read when the mod registers.

## Testing

`tests/blast-radius.test.tsx` covers classification, previews, Cancel, Proceed, the timeout and the no-screen refusal. Run `claude plugin test mods/blast-radius`.

## Known limits

- Only `rm`, `git push` and the listed migration tools are recognised; other destructive commands pass through.
- Delete previews list at most 5000 files and show 200 lines; quoted or variable paths are reported as unknown.
- Force push counts depend on the last `git fetch`.
- One command is held at a time; later calls poll every 0.25 s until the first is answered.
- Never rename the plugin (`blast-radius`) or the marketplace (`sandeep-mods`); existing installs and the `$.state` keys use those names.

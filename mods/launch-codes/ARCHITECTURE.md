# Launch Codes: architecture

## Overview

Launch Codes hooks every Bash tool call, classifies the command with a pure function, and for a dangerous one runs a short ceremony: open a pane with a one-time code, ask for the code, ask for LAUNCH. Only a completed ceremony lets the call continue; anything else returns a deny message to Claude.

```
tool.call (Bash) ─▶ classify() ─▶ safe: next(e)
                                └▶ danger: ceremony ─▶ $.state alert ─▶ Pane (RED ALERT) + siren
                                                     ├▶ $.ui.ask code ─▶ $.ui.ask LAUNCH ─▶ next(e)
                                                     └▶ wrong / ABORT / expired / error ─▶ deny
```

## Files

| File | Role |
| --- | --- |
| `hooks/hooks.json` | Points at `./register.tsx` |
| `hooks/register.tsx` | The hooks, the ceremony, the `/launch-codes` command and the pane |
| `hooks/classify.ts` | Pure command classifier, tokenizer, code generator and code check |
| `hooks/fx.ts` | Siren and launch sounds as WAV data, and the striped hazard border cells |
| `types/index.d.ts` | Types for the mod's `$.state` |
| `tests/classify.test.ts` | Classifier tests |

## Events hooked

| Event (matcher) | What the hook does | Gating? |
| --- | --- | --- |
| `session.start` | Registers `/launch-codes` | No |
| `tool.call` (`Bash`) | Classifies the command; for a dangerous one runs the ceremony and denies unless launched. A `.catch` denies a dangerous command if the hook throws | Yes |
| `command.run` (`launch-codes`) | `test <command>` returns the verdict; anything else runs a demo ceremony on a made-up command | No |
| `ui.render` (`Pane`, `launch-codes`) | Draws the alert for the current phase | No |

## Calls on $

| Call | Why |
| --- | --- |
| `$.command.register` | Adds `/launch-codes` |
| `$.state.get`, `$.state.set` (via `read` and `update`) | Keep the current alert |
| `$.ui.open`, `$.ui.close`, `$.ui.invalidate`, `$.ui.resolve` | Open and close the pane, repaint the countdown, get components |
| `$.ui.ask` | Ask for the code, then for LAUNCH or ABORT |
| `$.ui.blit` | Paint the animated hazard border on the terminal |
| `$.audio.play` | Looping siren while waiting; a short sound on launch |
| `$.clock.now`, `$.clock.every`, `$.clock.after` | Code expiry, countdown and border animation, delayed pane close |

## State

- `$.state` (`launch-codes.alert`): the current alert (command, reason, code, start and expiry times, phase, demo flag), or `null`.
- `$.store`: not used.
- Files: none.

## Drawing

A `Pane` with request id `launch-codes`, titled RED ALERT, 16 rows. On the terminal surface the top and bottom borders are raster cells updated every 70 ms; elsewhere they are a line of slashes. The pane shows the phase banner, the command, the reason, the code and a countdown.

## Settings flow

None. The code lifetime (30 seconds) and the pane size are constants in `register.tsx`.

## Testing

`tests/classify.test.ts` covers the classifier and the code helpers. The ceremony and pane are not covered by tests. Run `claude plugin test mods/launch-codes`.

## Known limits

- Only the listed patterns are checked; commands built inside scripts, `eval` or other tools are not inspected.
- The code is typed through the **Other** field of an ask dialog, so it needs a surface that shows ask dialogs.
- The siren needs audio support; failures to play are ignored.
- Never rename the plugin (`launch-codes`) or the marketplace (`sandeep-mods`); existing installs and the `$.state` key use those names.

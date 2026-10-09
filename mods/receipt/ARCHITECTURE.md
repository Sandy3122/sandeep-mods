# Receipt: architecture

## Overview

Receipt builds a ledger of each main-thread turn from the tool calls it makes, after they have run. It never changes a call. When the turn ends the ledger is finished and the band above the prompt draws it. A second, separate set of rules watches the main thread's calls for loops and raises toasts.

```
turn.start ─▶ new receipt in $.state
tool.call (after next) ─▶ addCall ─▶ receipt ; watchCall ─▶ watch ─▶ toast
turn.complete ─▶ finish ─▶ isShown
ui.render AbovePrompt ─▶ band (+ Replay button) ─▶ Pane receipt-replay
```

## Files

| File | Role |
| --- | --- |
| `hooks/hooks.json` | Points at `./register.tsx` |
| `hooks/register.tsx` | Hooks, `/receipt` command, band and replay pane |
| `hooks/ledger.ts` | Pure receipt and loop rules, built from each call |
| `hooks/config.ts` | Reads `userConfig` options into a typed `Config` |
| `hooks/i18n.ts` | Messages in eleven languages |
| `hooks/kit/` | Shared helpers: language resolution, option readers, band stacking and picker detection, `/config` writes |
| `types/index.d.ts` | Types for the mod's `$.state` |
| `assets/preview.png` | Screenshot used by the README |
| `tests/receipt.test.tsx` | Behaviour tests |

## Events hooked

| Event (matcher) | What the hook does | Gating? |
| --- | --- | --- |
| `session.start` | Resolves the language, registers `/receipt`, sets the hidden flag | No |
| `turn.start` | Starts a new receipt and clears the loop watch and the band | No |
| `tool.call` | Runs the call, then adds it to the receipt and the loop watch; may toast | Wraps the call, never refuses it |
| `turn.complete` | Finishes the receipt and shows the band if it has content | No |
| `command.run` (`receipt`) | Lists the receipt, opens replay, or switches the band off and on | No |
| `prompt.edit` | Tracks whether a `/` or `@` picker is open | No |
| `prompt.submit` | Clears the picker flag | Passes through |
| `ui.render` (`AbovePrompt`) | Draws the receipt band | No |
| `ui.render` (`Pane`, request `receipt-replay`) | Draws the replay pane | No |
| `ui.close` | Clears the replaying flag when the pane closes | Passes through |

## Calls on $

| Call | Why |
| --- | --- |
| `$.settings.read` | Reads Claude Code's `language` setting |
| `$.env.get` | Reads `LC_ALL`, `LC_MESSAGES`, `LANG` |
| `$.command.register` | Registers `/receipt` |
| `$.state.get`, `$.state.set` | Reads and writes the mod's state |
| `$.session.cwd` | Shortens paths in the receipt |
| `$.clock.now`, `$.clock.sleep` | Turn start time; a 150 ms wait before the pane opens |
| `$.ui.open`, `$.ui.close` | Opens and closes the replay pane |
| `$.ui.resolve` | Gets `Box`, `Text` and `Button` for drawing |
| `$.ui.toast` | Loop alerts |
| `$.config.set` | Writes the `visible` row for `/receipt off` and `on` |
| `$.store.get`, `$.store.delete` | Through the kit's `prefs` helpers; no key is written by this mod |

## State

- `$.state` (`receipt.receipt`): the current turn's receipt (files, commands, failures, reads, agents, warnings, checks, `isUnverified`, replay steps), or `null`.
- `$.state` (`receipt.watch`): the main thread's recent failures, edits and flips for the loop rules.
- `$.state` (`receipt.isShown`, `isHidden`, `isPicking`, `isReplaying`, `replayAt`): band visibility, the hidden flag mirrored from `visible`, picker open, replay open and the edit shown.
- `$.store`: none written.
- Files: none. The `visible` option is written through `$.config.set`.

## Drawing

The `AbovePrompt` band is a single row stacked above whatever else draws there. It is skipped while a survey shows, a picker is open, the pane is open or the receipt is hidden. The replay pane (request `receipt-replay`) shows one edit with its diff and Previous, Next and Close buttons. Both are terminal surfaces.

## Settings flow

`readConfig` reads `visible`, `repeatFailures`, `flipFlops`, `flagUnverified` and `language` from `options` once when the mod registers, using the kit's readers (`flag`, `count`, `text`). The loop thresholds go into the rules passed to `watchCall`. `language` goes to `resolveLanguage` at session start.

## Testing

`tests/receipt.test.tsx` covers the ledger, the loop alerts, the band, `/receipt` and the replay pane. Run `claude plugin test mods/receipt`.

## Known limits

- Only the main thread's calls feed the loop rules; subagent calls count in the receipt but not in alerts.
- A refused or failed edit has no replay diff. A turn keeps its first 50 edits, each up to 120 lines.
- Chat-only turns leave no receipt.
- The unverified flag relies on a list of known check commands.
- The hooks `tool.call`, `prompt.submit` and `ui.close` have no `.catch`; an error in them reaches the engine.
- `hooks/kit/` is copied from the original author's shared kit; do not expect the sync script here.
- Never rename the plugin (`receipt`) or the marketplace (`sandeep-mods`); existing installs and the `$.state` keys use those names.

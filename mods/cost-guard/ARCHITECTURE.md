# Cost Guard: architecture

## Overview

Cost Guard reads Claude Code's own cost and context figures after every measurement, keeps them in `$.state`, and draws them in a band above the prompt and in the status line. It also watches what you add to a chat and, for documents, redirects Claude's `Read` call to a markdown copy.

```
session.measure / turn.complete ─▶ $.state meter ─▶ AbovePrompt band + status line
prompt.submit / prompt.mention  ─▶ intake warnings (toast, log) ─▶ optional hold-once
tool.call Read (pdf, docx ...)  ─▶ converter ($.process.run) ─▶ .md copy ─▶ Read of the copy
daily totals                    ─▶ $.store, 90 days
```

## Files

| File | Role |
| --- | --- |
| `hooks/hooks.json` | Points at `./register.tsx` |
| `hooks/register.tsx` | Every hook, the band, `/spend` and the Handoff button |
| `hooks/figures.ts` | Settings parsing, money and token formatting, levels |
| `hooks/convert.ts` | Converter command list and file-extension helpers |
| `types/index.d.ts` | Types for the mod's `$.state` |
| `tests/cost-guard.test.tsx` | Behaviour tests |

## Events hooked

| Event (matcher) | What the hook does | Gating? |
| --- | --- | --- |
| `session.start` | Registers `/spend`, prunes old days, loads today's total | No |
| `session.measure` | Refreshes the meter from `$.session.usage()` | No |
| `session.end` | On `/clear`, resets the chat's figures | No |
| `turn.start` | Records the cost at the start of the turn | No |
| `turn.complete` | Records the reply's cost and input tokens (main loop only) | No |
| `prompt.submit` | Weighs the message; at the red level with `hold-once`, drops it once and refills the box | Yes |
| `prompt.mention` | Warns on large files; converts documents | Yes |
| `tool.call` (`Read`) | Redirects a convertible document to its markdown copy and adds a context note | Yes (rewrites) |
| `command.run` (`spend`) | Returns the `/spend` report | No |
| `ui.render` (`AbovePrompt`) | Draws the band | No |

## Calls on $

| Call | Why |
| --- | --- |
| `$.session.usage`, `$.session.root` | Cost and context figures; where to write copies |
| `$.state.get`, `$.state.set` | The meter and per-chat figures |
| `$.store.get`, `.set`, `.keys`, `.delete` | Daily totals, pruned after 90 days |
| `$.fs.stat`, `.exists`, `.read`, `.write` | Check files, write and recognise our own copies |
| `$.process.run` | Run a converter on one document |
| `$.prompt.fill`, `$.prompt.submit` | Put held text back; send the Handoff message |
| `$.ui.status`, `.toast`, `.log`, `.resolve` | Status line, toasts, transcript notes, band components |
| `$.command.register`, `$.clock.now`, `$.clock.after` | `/spend`, timestamps, deferred refill |

## State

- `$.state` (`cost-guard.*`): `meter`, `intake`, `hiddenLevel`, `converted`, `replies`, `ledgerUsd`, `chatBaseUsd`, `turnStartUsd`, `heldAtTokens`, `redirected`.
- `$.store`: one key per local day holding that day's dollars. Days older than 90 are deleted at session start.
- Files: `<name>.<ext>.md` beside the document, or under `.claude/cost-guard/` when that folder isn't writable. Copies begin with a `<!-- cost-guard: markdown copy ... -->` line; only files with that line are overwritten.

## Drawing

The `AbovePrompt` band, a status line entry, toasts and dim transcript rows. The band and status line draw in the terminal and desktop Code tab, not in the VS Code extension, `claude -p` or cloud sessions. The band is skipped while a survey is showing.

## Settings flow

`userConfig` options in `plugin.json` are read once in `register.tsx` and normalised in `figures.ts`; invalid values fall back to the defaults. Changes apply after a restart.

## Testing

`tests/cost-guard.test.tsx` covers the meter levels, intake warnings, hold-once, conversion and the `/spend` report on the terminal and desktop surfaces. Run `claude plugin test mods/cost-guard`.

## Known limits

- Figures are API list prices from Claude Code's own accounting; they are not a bill.
- "Today" only counts sessions on this machine that had the mod loaded.
- Scanned and password-protected PDFs are not converted.
- Never rename the plugin (`cost-guard`) or the marketplace (`sandeep-mods`); existing installs and the `$.state` keys use those names.

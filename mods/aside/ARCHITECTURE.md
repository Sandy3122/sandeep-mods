# Aside: architecture

## Overview

Aside keeps a list of side questions in memory and draws them in a pane. Each question goes to `$.model.fork` over the session transcript as of the last completed turn. If there is no snapshot yet, a plain completion over the transcript text answers instead, or the question waits for the turn to end. Nothing is written to the main thread.

```
/aside [question] ─▶ open pane ─▶ ask ─▶ $.model.fork ─▶ answer ─▶ pane redraw
                                          │ (null: no snapshot yet)
                                          ├─ liveFallback on  ─▶ $.session.messages + $.model.complete
                                          └─ liveFallback off ─▶ queue ─▶ turn.complete ─▶ fork again
ui.input / ui.press ─▶ ask, Clear, Close
```

## Files

| File | Role |
| --- | --- |
| `hooks/hooks.json` | Points at `./register.ts` |
| `hooks/register.ts` | Every hook, the pane, prompt building and the live fallback |
| `tests/register.test.ts` | Behaviour tests run by `claude plugin test`, using the Claude Code test kit |
| `tests/harness.ts` | The older fake engine, written for Node's own runner. The current test does not use it |
| `evals/` | Evaluation cases for `claude plugin eval` (need credentials to run) |
| `docs/investigation/` | Upstream measurements the design rests on: `FINDINGS.md`, `DESIGN.md`, probe plugins and evidence logs. Not used at run time |
| `tsconfig.json` | Own tsconfig; includes `.claude/types` and `hooks` |

## Events hooked

| Event (matcher) | What the hook does | Gating? |
| --- | --- | --- |
| `session.start` | Builds the host wrapper over `$` and registers `/aside` | No |
| `command.run` (`aside`) | Opens the pane, asks the question if given, answers `{}` | Yes (answers the command) |
| `turn.complete` | Re-runs queued questions as forks | No |
| `ui.render` (`Pane`) | Draws the pane when the request id is `aside` | No |
| `ui.input` (`aside`, `q`) | On submit, asks the question | No |
| `ui.press` (`aside`) | Handles the Clear and Close buttons | No |

## Calls on $

| Call | Why |
| --- | --- |
| `$.command.register` | Add `/aside` |
| `$.model.fork` | Answer a question from the transcript snapshot, tool-less |
| `$.model.complete` | Live answer on `liveModel`, 400 tokens at most |
| `$.session.messages` | Transcript text for a live answer |
| `$.ui.open`, `$.ui.close` | Open and close the pane |
| `$.ui.invalidate`, `$.ui.resolve` | Redraw; get Box, Text, Input and Button |
| `$.clock.now` | Time each answer |

## State

- No `$.state` or `$.store` keys.
- No files on disk.
- The side chat (`history`, `queued`, `inFlight`) lives in module memory for the session and is lost when it ends.

## Drawing

One `Pane` with id `aside`: a header, the recent exchanges, an input and Clear and Close buttons. It docks beside the transcript in terminals at least 110 columns wide and opens inline above the prompt otherwise.

## Settings flow

`userConfig` options are passed to `register(on, options)` and checked there: a wrong type or out-of-range value falls back to the default (`liveFallback` true, `liveModel` haiku, `maxHistory` 8). They are read once, so changes apply after a restart.

## Testing

`tests/register.test.ts` runs the real hooks over a mocked engine with the Claude Code test kit (`claude-code/testing`). Run `claude plugin test mods/aside`. It covers registration, the fork path, the live fallback, queuing, history in the prompt, the pane and its buttons, and that only the allowed `$` verbs are used: a verb the test does not answer fails the call. Three things from the older Node-runner test are not reproduced exactly. The elapsed time in the pane is only checked as a number slot, because the kit does not give the hook a clock you can set. The list of registered events is not asserted, and a press on another plugin's button cannot be sent through the kit, so that pass-through is not tested. A failed fork is tested for its error row, but not for the exact message.

## Known limits

- A fork sees the last completed turn, not the one in progress.
- The live fallback is uncached, has no system prompt from the session, and sends at most 60,000 characters.
- The side chat is not saved between sessions.
- Answers are cut at 1,200 characters.
- Never rename the plugin (`aside`) or the marketplace (`sandeep-mods`); existing installs use those names.

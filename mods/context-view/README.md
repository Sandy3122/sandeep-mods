# Context View

Context View shows how full the context window is as one meter row above the prompt, with the percentage used and the tokens left before auto-compact.

Part of [Sandeep Mods](https://github.com/Sandy3122/sandeep-mods) · Cost and usage

```
▰▰▰▰▰▰▰▰▱▱▱▱▱▱▱▱▱▰▰▰  42% · 84.1k/200k tokens · 82.9k until auto-compact
```

*The row above the prompt (example figures).*

## What it does

- Draws a meter row in the band above the prompt, in the style of Claude Code's own meters: filled cells for the context, empty cells for the window left, and dim cells for the reserve auto-compact keeps.
- Shows the percentage used, the tokens over the window size, and the tokens left before auto-compact.
- Updates after every turn and after every request inside a long turn, and again after `/clear`, a resume, a branch, a compaction, a model switch or a change to auto-compact.
- Marks figures with `~` when they are an estimate, for example in a new session before the first reply.
- Changes colour as the window fills: warning colour from six tenths of the way to the auto-compact threshold, error colour in the last 20k tokens before it.
- Narrows to fit the band: the meter shrinks from 20 cells to 12 and 8, then the headroom, then the tokens drop out. The percentage stays.

## Install

```
/plugin marketplace add Sandy3122/sandeep-mods
/plugin install context-view@sandeep-mods
```

## Use

- **The row.** It appears above the prompt as soon as the session is up. It is hidden while a survey holds the band.
- **`/context-view`.** Hides the row, or shows it again. The transcript says `Context view hidden` or `Context view shown`.
- **`/context-view hide` and `/context-view show`.** Set it directly (`off` and `on` also work). Any other word prints `Usage: /context-view [show|hide]`.
- Your choice is kept for later sessions.
- With auto-compact off, the headroom counts down to the point where Claude Code stops sending requests, then reads `run /compact to continue`.
- Past the auto-compact threshold, the headroom reads `auto-compact next`.

## Settings

None.

## Requirements

- Claude Code 2.1.290+ (terminal or desktop app Code tab). The original author tested on 2.1.292.

## What it can access

- **Hooks:** session start, `/clear`, resume and branch, each main-thread turn and each request of a turn, compactions, model switches, the auto-compact setting, the `/autocompact` and `/model` commands, its own `/context-view` command, and the band above the prompt.
- **Passes events on:** apart from drawing the row and answering `/context-view`, every hook passes its event on and returns what Claude Code answered, unchanged. It does not rewrite or refuse prompts, tool calls, commands, settings or compactions.
- **Reads:** the session's context figures (through the session usage call, estimated locally), and the `TERM` and `TERM_PROGRAM` environment variables, to tell whether the terminal is Ghostty.
- **Network and models:** none. It makes no network request and calls no model, so it costs no tokens.
- **Runs programs:** none.
- **Writes files:** none. It keeps your hide or show choice in the mod's store, and writes read failures to the debug log only.
- **Timers:** it re-reads the live figures every two seconds and again shortly after a change that Claude Code lands late.

## Troubleshooting

- **No row appears.** The row is hidden if you ran `/context-view` earlier, and it is not drawn while a survey holds the band or before Claude Code has a figure. Run `/context-view show`.
- **The percentage differs from Claude Code's `context used` line.** Claude Code's line counts against the window less the room it keeps for a reply, so it reads higher.
- **Figures show `~`.** They are an estimate until the first response of the window lands. This is normal after a new session, `/clear` or a compaction.
- **The row is stale after editing settings by hand.** A change to `autoCompactEnabled` made in a settings file, not in `/config`, shows after the next turn.
- **Something failed quietly.** Run `claude --debug` and look for messages under `context-view`. The row keeps its last reading.

## License

MIT; see LICENSE.

## Credits

Adapted and maintained by Sandeep as part of Sandeep Mods. Originally created by kongyo2, MIT.

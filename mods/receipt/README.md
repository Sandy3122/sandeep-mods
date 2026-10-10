# Receipt

Receipt leaves a one-line summary above the prompt when a turn ends, showing the files Claude changed, the commands it ran and how many failed.

Part of [Sandeep Mods](https://github.com/Sandy3122/sandeep-mods) · Workflow

![The receipt band showing what the last turn changed, ran and read](assets/preview.png)

## What it does

- Shows a band above the prompt after each turn that used a tool: how the turn ended, how long it took, files changed with lines added and removed, commands run and failed, reads, subagents and warnings.
- Counts a subagent's edits and commands toward the turn that started it.
- Marks the receipt `unverified` when code changed after the turn's last test, build, lint or type check, or when none ran. Edits to prose files such as Markdown do not count.
- Replays the turn's edits one at a time in a pane, with each diff.
- Shows a toast when Claude seems to go in circles: the same call failing again and again, or a file edited back and forth.
- Reads only the tool calls the turn already made, so it adds no tool and no prompt text.

## Install

```
/plugin marketplace add Sandy3122/sandeep-mods
/plugin install receipt@sandeep-mods
```

## Use

Nothing to start. When a turn that used a tool ends, the band appears above the prompt. It leaves when the next turn starts. A chat-only turn leaves no receipt. The band steps aside while a `/` or `@` picker is open.

A receipt looks like this:

```
✓ Last turn 2m 13s · Edited 3 +48 −12 · Commands 6 · 1 failed · Reads 14 · Agents 1 · ⚠ 1
```

The first mark shows how the turn ended: `✓` answered, `◼` interrupted, `✗` error.

Commands:
- `/receipt` lists the last receipt in full: every file with its lines (`new` for a file the turn created), every failed command and every warning.
- `/receipt replay` opens a pane with the turn's edits, one at a time. You can also press **r** on the band's Replay button.
- `/receipt off` and `/receipt on` hide or show the band. They write the `visible` setting, so later sessions keep the choice.

In the replay pane, **n** and **p** move to the next and previous edit, and **c** or Esc closes it. Diffs come from the edits' results, so a refused or failed edit is missing. A turn keeps its first 50 edits, each up to 120 lines.

The toast fires once per streak, for the main thread only:
- The same call fails `repeatFailures` times in a row with nothing changed in between. An edit, or a shell command that was not read-only (`sed -i`, `npm install`), counts as work and resets the count. `cat` or `ls` does not.
- A file is edited back to what an earlier edit took out, `flipFlops` times.

## Settings

| Option | Default | What it does |
| --- | --- | --- |
| `visible` | `true` | Shows the receipt above the prompt between turns |
| `repeatFailures` | `3` | Toast after the same call fails this many times in a row; `0` turns it off |
| `flipFlops` | `2` | Toast after a file is edited back and forth this many times; `0` turns it off |
| `flagUnverified` | `true` | Marks the receipt when code changed after the last test, build, lint or type check |
| `language` | `auto` | Language of the receipt, `/receipt` and the toasts: `auto`, `en`, `zh-Hans`, `zh-Hant`, `ja`, `ko`, `es`, `fr`, `de`, `pt-BR` or `ru` |

`auto` follows Claude Code's language setting, then your system locale, then English.

Change them in `/plugin` → **Installed** → **receipt** → **Configure options**, or run `claude plugin configure receipt@sandeep-mods`.

## Requirements

- Claude Code 2.1.287+ (terminal or desktop app Code tab).
- No other programs needed.

## What it can access

- **Hooks:** session start, turn start and end, every tool call (after it has run), the `/receipt` command, prompt edits and submits, and the drawing of the band above the prompt and the replay pane.
- **Gating:** it never refuses or holds a tool call. It reads each call's input and result after the call finishes.
- **Reads:** your Claude Code settings (for the language), the `LC_ALL`, `LC_MESSAGES` and `LANG` environment variables, and the session's working directory, to shorten file paths.
- **Writes:** the `visible` setting when you run `/receipt off` or `/receipt on`. It writes no other files.
- **Programs, network and models:** none. It runs no programs, makes no network requests and calls no model, so it costs no tokens.

## Troubleshooting

- **No band appears.** Check that `visible` is on (`/receipt on`). A turn with no tool calls leaves no receipt, and the band hides while a `/` or `@` picker is open or a survey is showing.
- **A receipt says `unverified` and I ran tests.** Only commands it recognises count, such as `npm test`, `pytest`, `go test`, `cargo check`, `tsc`, `eslint`, `make` or a script named like `check.sh`. A check that ran before the last code edit does not count.
- **Replay is empty or missing an edit.** Refused or failed edits have no diff. Replay needs at least one edit in the last turn.
- **The text is in the wrong language.** Set `language` to the one you want instead of `auto`.

## License

MIT; see LICENSE.

## Credits

Adapted and maintained by Sandeep as part of Sandeep Mods. Originally created by [hoobnn](https://github.com/hoobnn) in [hoobnn/hoobnn-agent-mods](https://github.com/hoobnn/hoobnn-agent-mods/tree/b95d1e454a76523e433fb37e5ca171e1f5576676/claude-code/receipt), MIT.

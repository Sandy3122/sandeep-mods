# Agent Compact Advisor

Agent Compact Advisor shows a 0-100 score on the status line for how good a moment it is to `/compact`, and keeps your goal, decisions and file paths in every compaction.

Part of [Sandeep Mods](https://github.com/Sandy3122/claude-mods) · Context

## What it does

- Shows a score from 0 to 100 on the status line after each main turn and every 30 seconds, with the reasons in words.
- Sets the score to 0 while something would be lost: running agents, live background work, uncommitted or unpushed changes in git, or leftovers the last answer listed.
- Alerts when the context reaches a share of the window (60% by default), with one toast per crossing, whatever the score.
- Puts a ready `/compact` line in the empty prompt box once the score reaches the threshold. Press Tab to take it.
- Adds a preservation template to every `/compact` and auto-compaction of the main conversation: goal, decisions, open leftovers, file paths, verification results and what not to do.
- Never compacts by itself and never cancels a compaction.

## Install

```
/plugin marketplace add Sandy3122/claude-mods
/plugin install agent-compact-advisor@sandeep-mods
```

## Use

Nothing to start. The score appears on the status line once a turn has finished.

- `/compact-advisor` explains the current score part by part.
- Tab takes the suggested `/compact` line from the empty prompt.

How the score works:
- A gate sets it to 0 and the line says which one, for example "too early: 2 agents running".
- Below `minTokens` of context the score is 0, because there is nothing worth compacting yet.
- Otherwise the score adds three parts: how full the context is (40), whether the last answer's leftover lines all say none (30), and whether the prompt cache is still warm (10).
- When the rules say the moment is ready, a small model reads the end of the last answer. It can only lower the verdict, and only if the answer promises more work.
- A probability from Kev (a local System One service) can cap the score. It is off unless that service runs on your machine.

Leftovers are read from lines that start with `Хвосты для агента:` and `Хвосты для владельца:`. For English, set `leftoverPrefixes` to `Leftovers:`. The status line and toasts use Russian by default; set `language` to `en` to change that.

## Settings

| Option | Default | What it does |
| --- | --- | --- |
| `threshold` | `70` | Score from which the ready `/compact` is suggested |
| `minTokens` | `100000` | Context below this scores 0 |
| `fullTokens` | `300000` | Context at which the fill part of the score is complete |
| `cacheTtlMin` | `5` | Minutes after a turn the prompt cache counts as warm (60 with the 1-hour cache) |
| `systemOneUrl` | `http://127.0.0.1:8010` | Kev's System One address; loopback only, empty turns it off |
| `kevModel` | `kev-latest` | System One model asked for the probability |
| `leftoverPrefixes` | `Хвосты для агента:\|Хвосты для владельца:` | `\|`-separated line prefixes that report leftovers |
| `noneWords` | `нет\|none` | `\|`-separated values meaning no leftovers |
| `guardCompactions` | `true` | Add the preservation template to every compaction |
| `ignoreLeftovers` | `false` | Leftovers neither gate nor cap the score; for a coordinator session that always waits on others |
| `modelCheck` | `true` | A small model reads the last answer when the rules say ready |
| `language` | `ru` | Words of the status line, toasts and explanation: `ru` or `en` |
| `alertPercent` | `60` | Context share (%) that alerts whatever the score; `0` turns it off |
| `statusLine` | `true` | Show the score on the status line |

Change them in `/plugin` → **Installed** → **agent-compact-advisor** → **Configure options**, or run `claude plugin configure agent-compact-advisor@sandeep-mods`.

## Requirements

- Claude Code 2.1.287+ (terminal or desktop app Code tab).
- `git` on your path to check for unrecorded changes. Without it the line never says everything is recorded.
- Optional: the agent-shell-watch mod, so the advisor can see background calls. Without it background work counts as unknown and caps the score.
- Optional: a Kev System One service on loopback for the probability.

## What it can access

- **Hooks:** session start, tool calls, turn start, size readings, finished turns, compactions and the `/compact-advisor` command. It changes a compaction only by adding the template to its instructions.
- **Calls a model (costs tokens):** after a main turn, when the rules already say ready, it sends the last 6000 characters of the answer to `haiku` through your own Claude Code session, with a 15 second limit and 8 output tokens. Turns under `minTokens` are skipped. Turn it off with `modelCheck`.
- **Network:** one request, to Kev's System One at `systemOneUrl`. It posts the last 8000 characters of the answer to `/v1/systemone`, with a 20 second timeout. Only `127.0.0.1`, `localhost` and `[::1]` are accepted. Any other address, or an empty one, turns this off and nothing is sent. Whatever listens on that port receives the text.
- **Runs programs:** `git` in your session folder and in the repository of every file the session wrote to, with a 5 second limit. It runs `rev-parse --show-toplevel`, `config`, `status --porcelain`, `diff --name-only`, `rev-list --count` and similar read-only commands. It does not fetch.
- **Reads:** the session transcript, to rebuild the list of files written to after a resume; the list of running agents; and the `agent-shell-watch` call list in `$.state`, if that mod is loaded.
- **Writes files:** none. It keeps its facts in `$.state` for the session. It stores nothing across sessions.
- **Draws:** the status line, toasts and the prompt suggestion.

## Troubleshooting

- **The line is in Russian.** That is the default. Set `language` to `en`.
- **The score stays at 0 and says leftovers.** The last answer listed leftovers, or the advisor found no leftover lines. Add the lines to your answers, change `leftoverPrefixes`, or set `ignoreLeftovers`.
- **It says changes are not recorded.** Git reports uncommitted files or commits not on the upstream. Commit and push, or the gate stays.
- **No probability on the line.** Kev is off unless something listens at `systemOneUrl`. That is fine; the score works without it.

## License

MIT; see LICENSE. `engine-types/claude-code.d.ts` is copyright Anthropic PBC and not covered by it; see `engine-types/NOTICE.md`.

## Credits

Adapted and maintained by Sandeep as part of Sandeep Mods. Originally created by [apolenkov](https://github.com/apolenkov) in [apolenkov/agent-compact-advisor](https://github.com/apolenkov/agent-compact-advisor/tree/5486abec02ae09bda76750993a0f68ca61b76dbf), MIT.

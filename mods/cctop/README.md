# Cctop

Cctop shows a live dashboard of your Claude Code session in a pane, with cost, tokens, context, tools and a coach that suggests what to do next.

Part of [Sandeep Mods](https://github.com/Sandy3122/sandeep-mods) · Cost and usage

## What it does

- Opens a dashboard pane docked inside Claude Code, with seven views: Coach, Overview, Tools, Agents, Files, Events and Advisor.
- Times every tool call and tracks turns, compactions and the context window as the session runs.
- Pulls deeper numbers (cost per turn, cache use, rate limits, subagent waste, recommendations) from the separate `cctop` program.
- Shows the coach's current suggestion on the status line and as a toast, and can fill the suggested prompt into your prompt box without sending it.
- Adds a `cctop-insights` skill so Claude can answer questions such as "why is this session expensive?" from the same numbers.
- Adds a `/cctop` skill that opens the dashboard beside Claude Code in tmux, zellij, WezTerm, Kitty or iTerm2 when the docked pane is not available.

## Install

```
/plugin marketplace add Sandy3122/sandeep-mods
/plugin install cctop@sandeep-mods
```

Install the `cctop` program too. The pane shows only the numbers Claude Code gives it until the program is there:

```
brew install tomstagl/tap/cctop
```

## Use

- **`/cctop-pane`.** Opens the pane, or closes it if it is open.
- **`/cctop-pane <view>`.** Opens the pane on one view: `coach`, `overview`, `tools`, `agents`, `files`, `events` or `advisor`.
- **`/cctop-pane close`.** Closes the pane.
- **View bar.** The first row of the pane. Click a tab, or tab to it and press Enter.
- **`/cctop`.** Runs the skill. On a build with function hooks it opens the same pane. Otherwise it opens the dashboard in a side pane of your terminal.
- **Asking Claude.** With the `cctop` program installed, ask things like "what is filling my context?" and the `cctop-insights` skill answers from its numbers.

The pane reopens on the view you left it on in your next interactive session. In the narrow strip above the prompt it shows only the header, context and limits.

## Settings

None.

## Requirements

- Claude Code 2.1.287+ (terminal or desktop app Code tab).
- The `cctop` program on your PATH for cost, cache, limits and coach data (`brew install tomstagl/tap/cctop`, or `cargo install cctop`).
- For the `/cctop` side pane fallback: tmux, zellij, WezTerm, Kitty or iTerm2.

## What it can access

- **Hooks:** session start, turn start and complete, compaction, every tool call, `/cctop-pane`, the `cctop` skill prompt, closing the pane and drawing it. The tool call hook only times the call and passes the result through unchanged.
- **Reads:** the tool names, durations and result sizes; the session id, model name and token usage; the `HOME` environment variable; and its own manifest to show its version.
- **Network and models:** none from the mod. It calls no model. Whatever the `cctop` program does on its own is outside this mod.
- **Runs programs:** `cctop --version`, `cctop query --help`, and `cctop query <view> --session <id> --surface pane` every 2 seconds while a turn runs and every 10 seconds otherwise, only while the pane is open. Each call times out after 5 seconds. Snoozing a coach suggestion runs `cctop query coach --snooze <rule>`.
- **Writes files:** `~/.cctop/pane/<session id>.json`, a small marker the `cctop` program reads to know the pane is open. It is rewritten on every poll. The pane's open state and view are kept in the plugin's store.
- **Prompt box:** the coach's Fill button writes text into your prompt box. It never sends it.
- **The skills:** `/cctop` has Claude run `command -v cctop` and `cctop pane status`, check for `~/.cctop/installed`, and, if you say yes, run `cctop install --yes`, which edits `~/.claude/settings.json` after showing a diff and making a backup. If you say no, it creates `~/.cctop/declined-install`. `cctop-insights` runs `cctop query` commands, which only read.
- **Approvals:** it never approves anything.

## Troubleshooting

- **The pane shows "needs the cctop binary".** Install the `cctop` program and make sure it is on the PATH Claude Code uses.
- **`/cctop-pane` says the pane is hidden.** The `/diff` panel holds the dock. Run `/diff` to close it.
- **The pane says "cctop query stale".** No query has fully succeeded for 30 seconds. Run `cctop query summary` in a terminal to see the error.
- **A view says a query is not supported.** Your `cctop` program is older than the pane expects. Upgrade it.

## License

MIT; see LICENSE.

## Credits

Adapted and maintained by Sandeep as part of Sandeep Mods. Originally created by tomstagl, MIT.

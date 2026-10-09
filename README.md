# Sandeep Mods

Sandeep Mods is a marketplace of Claude Code mods. Most are open-source mods by other authors, adapted and maintained here by Sandeep. One, `cost-guard`, is original. Every mod has the same layout, a README, an ARCHITECTURE.md and a CHANGELOG, and every original author is credited.

## Install

Add the marketplace once, inside Claude Code:

```
/plugin marketplace add Sandy3122/claude-mods
```

Then install any mod from the list below, for example:

```
/plugin install cost-guard@sandeep-mods
```

From your shell, run `claude plugin marketplace add Sandy3122/claude-mods`, then `claude plugin install <mod>@sandeep-mods`.

Mods need Claude Code 2.1.287 or newer, in the terminal or the desktop app's Code tab.

## Mods

<!-- mods:start -->
### Cost and usage

| Mod | What it does | Install |
| --- | --- | --- |
| [cctop](mods/cctop) | btop-style live dashboard for Claude Code internals: /cctop opens it in a side pane, cctop-insights lets the session answer questions from its numbers | `/plugin install cctop@sandeep-mods` |
| [context-view](mods/context-view) | The context window as one row above the prompt, drawn the way Claude Code draws its own meters: the context's cells, the percentage used, the tokens over the window, and the tokens left before auto-c… | `/plugin install context-view@sandeep-mods` |
| [cost-guard](mods/cost-guard) | Shows what each chat, reply and day costs, nudges you to a fresh session when a chat gets long or heavy, and turns PDFs, Word, PowerPoint and Excel files into markdown before Claude reads them. | `/plugin install cost-guard@sandeep-mods` |
| [flightdeck](mods/flightdeck) | Flightdeck: a live agent dashboard for Claude Code. Main model vitals, an on-call architect, every permission check, subagent cards and swimlanes, a turn receipt and a session log, all from real sess… | `/plugin install flightdeck@sandeep-mods` |
| [weektoken](mods/weektoken) | Rate-limit pace for Claude Code's 5-hour and weekly windows: usage against elapsed time, plain-language forecast, per-model quotas and burn-up history. A band above the prompt and a full /weektoken p… | `/plugin install weektoken@sandeep-mods` |

### Context

| Mod | What it does | Install |
| --- | --- | --- |
| [agent-compact-advisor](mods/agent-compact-advisor) | Status line score 0-100 for how good a moment it is to /compact now, with reasons; offers a ready /compact that keeps goal, decisions, leftovers and paths, and adds that template to every compaction.… | `/plugin install agent-compact-advisor@sandeep-mods` |
| [aside](mods/aside) | Read-only side chat: /aside opens a pane beside the transcript where you ask about the session so far; answers come from a tool-less fork of the session's own transcript and nothing is written back i… | `/plugin install aside@sandeep-mods` |
| [harness-scope](mods/harness-scope) | Turn global skills, rules, agents and tools on or off per repo with named profiles | `/plugin install harness-scope@sandeep-mods` |
| [micro-compaction](mods/micro-compaction) | Adds `/compact micro`: elides Read results and strips thinking, keeping the conversation structure | `/plugin install micro-compaction@sandeep-mods` |

### Safety

| Mod | What it does | Install |
| --- | --- | --- |
| [blast-radius](mods/blast-radius) | Holds risky Bash commands and shows what they would change before they run. | `/plugin install blast-radius@sandeep-mods` |
| [launch-codes](mods/launch-codes) | Dangerous Bash commands need launch codes: red alert pane, siren, a code to arm and a LAUNCH to fire | `/plugin install launch-codes@sandeep-mods` |
| [secret-redactor](mods/secret-redactor) | Keeps secrets, email addresses and IP addresses out of the session transcript: swaps each one for a stable placeholder on the way in, and puts the real value back on the way into a tool call | `/plugin install secret-redactor@sandeep-mods` |

### Workflow

| Mod | What it does | Install |
| --- | --- | --- |
| [rabe](mods/rabe) | Watch Claude Code's background work: subagents, Codex jobs, shells, monitors, cron jobs and workflows. | `/plugin install rabe@sandeep-mods` |
| [receipt](mods/receipt) | What each turn did, in a band above the prompt once it ends (files changed with lines, commands and failures, reads, subagents), and a toast when the model goes in circles; read from the turn's own t… | `/plugin install receipt@sandeep-mods` |
| [todo-bar](mods/todo-bar) | The task list's progress in a band above the prompt, read from the todo and task tools' own calls: no tool, no prompt, no tokens | `/plugin install todo-bar@sandeep-mods` |

### Git and deploys

| Mod | What it does | Install |
| --- | --- | --- |
| [deploy-verify](mods/deploy-verify) | After a deploy command succeeds, curls the live URL with cache-busting and puts the verdict in the model's context, so a deploy cannot be claimed without evidence. | `/plugin install deploy-verify@sandeep-mods` |
| [github-issues](mods/github-issues) | A side pane listing the repository's GitHub issues, with one click to have Claude work on one | `/plugin install github-issues@sandeep-mods` |
| [pr-pulse](mods/pr-pulse) | PR Pulse: live status, merge readiness, checks, comments, review queue and change alerts for your GitHub PRs, with a collapsible band | `/plugin install pr-pulse@sandeep-mods` |

### Viewing output

| Mod | What it does | Install |
| --- | --- | --- |
| [md-preview](mods/md-preview) | Shows the Markdown files Claude edits, rendered like GitHub, in a pane next to the chat. Before and after side by side. /md opens it. | `/plugin install md-preview@sandeep-mods` |
| [prismantis](mods/prismantis) | Colorful, themeable rendering for Claude Code replies: tables, headings, code, numbers, paths and links. | `/plugin install prismantis@sandeep-mods` |
| [terminal-browser](mods/terminal-browser) | A browser running directly inside claude code. Preview websites, view HTML documents, and let your agent control the built in browser. | `/plugin install terminal-browser@sandeep-mods` |
<!-- mods:end -->

## How the mods are kept consistent

Every mod follows [docs/MOD_STANDARD.md](docs/MOD_STANDARD.md): the same files, the same manifest fields and the same README sections, written in one voice. Standardizing changes how a mod is presented, never what it does. Each mod passes `claude plugin validate --strict` and, where it has tests, `claude plugin test`.

## Safety

A mod runs with your permissions. Some run programs, write files, make network requests or call a model, which costs tokens. Read the "What it can access" section of a mod's README before you install it.

## Updating

Run `claude plugin update <mod>@sandeep-mods`, or turn on auto-update for this marketplace in `/plugin` → Marketplaces.

## Credits

Most of these mods started as open-source projects by other authors. [CREDITS.md](CREDITS.md) lists every original author, source and license, and each mod's README ends with a Credits section.

## License

Each mod is under the license in its own folder. Everything else in this repository is [MIT](LICENSE), © 2026 Sandeep.

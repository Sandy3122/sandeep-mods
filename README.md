# Sandeep Mods

Sandeep Mods is a marketplace of Claude Code mods. Most are open-source mods by other authors, adapted and maintained here by Sandeep. One, `cost-guard`, is original. Every mod has the same layout, a README, an ARCHITECTURE.md and a CHANGELOG, and every original author is credited.

## Install

Add the marketplace once, inside Claude Code:

```
/plugin marketplace add Sandy3122/sandeep-mods
```

Then install any mod from the list below, for example:

```
/plugin install cost-guard@sandeep-mods
```

From your shell, run `claude plugin marketplace add Sandy3122/sandeep-mods`, then `claude plugin install <mod>@sandeep-mods`.

Mods need Claude Code 2.1.287 or newer, in the terminal or the desktop app's Code tab.

## Mods

<!-- mods:start -->
### Cost and usage

| Mod | What it does | Install |
| --- | --- | --- |
| [cctop](mods/cctop) | Shows a live dashboard of your session's cost, tokens, context and tools in a pane, and lets Claude answer questions from the same numbers. | `/plugin install cctop@sandeep-mods` |
| [context-view](mods/context-view) | Shows how full the context window is as a meter row above the prompt, with the percentage used and the tokens left before auto-compact. | `/plugin install context-view@sandeep-mods` |
| [cost-guard](mods/cost-guard) | Shows what each chat, reply and day costs, warns you when a chat gets long, and converts documents to markdown before Claude reads them. | `/plugin install cost-guard@sandeep-mods` |
| [flightdeck](mods/flightdeck) | Shows a live dashboard of context, cost, permission checks and subagents in a Claude Code pane, built from real session events. | `/plugin install flightdeck@sandeep-mods` |
| [weektoken](mods/weektoken) | Shows your 5-hour, weekly and per-model usage limits against elapsed time, with a forecast and history, in a band above the prompt and a pane. | `/plugin install weektoken@sandeep-mods` |

### Context

| Mod | What it does | Install |
| --- | --- | --- |
| [agent-compact-advisor](mods/agent-compact-advisor) | Shows a 0-100 status line score for how good a moment it is to /compact, and adds a preservation template to every compaction. | `/plugin install agent-compact-advisor@sandeep-mods` |
| [aside](mods/aside) | Opens a read-only side chat pane where you ask about the session so far; a tool-less fork of the transcript answers and nothing enters the main thread. | `/plugin install aside@sandeep-mods` |
| [harness-scope](mods/harness-scope) | Turns global skills, rules, agents and tools on or off per repo using named profiles. | `/plugin install harness-scope@sandeep-mods` |
| [micro-compaction](mods/micro-compaction) | Adds /compact micro, which replaces Read results with short placeholders and drops thinking without calling a model. | `/plugin install micro-compaction@sandeep-mods` |

### Safety

| Mod | What it does | Install |
| --- | --- | --- |
| [blast-radius](mods/blast-radius) | Holds risky Bash commands and shows what they would change before they run. | `/plugin install blast-radius@sandeep-mods` |
| [launch-codes](mods/launch-codes) | Asks for a one-time code and a second confirmation before Claude runs a dangerous Bash command such as rm -rf, git push --force or vercel --prod. | `/plugin install launch-codes@sandeep-mods` |
| [secret-redactor](mods/secret-redactor) | Replaces secrets, email addresses and public IP addresses in the chat with stable placeholders, and restores the real values when a tool runs. | `/plugin install secret-redactor@sandeep-mods` |

### Workflow

| Mod | What it does | Install |
| --- | --- | --- |
| [rabe](mods/rabe) | Shows the subagents, Codex jobs, shells, monitors, cron jobs and workflows running in the background, in a band above the prompt and a pane. | `/plugin install rabe@sandeep-mods` |
| [receipt](mods/receipt) | Shows what each turn did in a band above the prompt: files changed, commands, failures, reads and subagents. | `/plugin install receipt@sandeep-mods` |
| [todo-bar](mods/todo-bar) | Shows the task list's progress in a band above the prompt, read from Claude's own todo and task tool calls. | `/plugin install todo-bar@sandeep-mods` |

### Git and deploys

| Mod | What it does | Install |
| --- | --- | --- |
| [deploy-verify](mods/deploy-verify) | After a deploy command succeeds, checks the live URL with cache-busting and tells Claude the result, so a deploy is not called done without evidence. | `/plugin install deploy-verify@sandeep-mods` |
| [github-issues](mods/github-issues) | Lists a repository's GitHub issues in a side pane, with one click to have Claude work on one. | `/plugin install github-issues@sandeep-mods` |
| [pr-pulse](mods/pr-pulse) | Watch your GitHub pull requests from Claude Code: checks, merge readiness, comments, review queue and change alerts. | `/plugin install pr-pulse@sandeep-mods` |

### Viewing output

| Mod | What it does | Install |
| --- | --- | --- |
| [md-preview](mods/md-preview) | Shows the Markdown files Claude edits, rendered like GitHub, in a pane next to the chat, with before and after side by side. | `/plugin install md-preview@sandeep-mods` |
| [prismantis](mods/prismantis) | Redraws Claude Code replies with themeable colors: tables, headings, code, diagrams, tool rows and copy buttons. | `/plugin install prismantis@sandeep-mods` |
| [terminal-browser](mods/terminal-browser) | Opens a real browser in a pane inside Claude Code, with a /browser command and an optional tool that lets the agent open pages. | `/plugin install terminal-browser@sandeep-mods` |
<!-- mods:end -->

## How the mods are kept consistent

Every mod follows [docs/MOD_STANDARD.md](docs/MOD_STANDARD.md): the same files, the same manifest fields and the same README sections, written in one voice. Standardizing changes how a mod is presented, never what it does. Each mod passes `claude plugin validate --strict` and, where it has tests, `claude plugin test`.

## Safety

A mod runs with your permissions. Some run programs, write files, make network requests or call a model, which costs tokens. Read the "What it can access" section of a mod's README before you install it.

## Updating

Run `claude plugin update <mod>@sandeep-mods`, or turn on auto-update for this marketplace in `/plugin` → Marketplaces.

## Credits

Most of these mods started as open-source projects by other authors. [CREDITS.md](CREDITS.md) lists every original author and license, and each mod's README ends with a Credits section.

## License

Each mod is under the license in its own folder. Everything else in this repository is [MIT](LICENSE), © 2026 Sandeep.

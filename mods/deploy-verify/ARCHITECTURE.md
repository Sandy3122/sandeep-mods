# Deploy Verify: architecture

## Overview

Deploy Verify watches Claude's Bash calls. When one looks like a deploy and exits 0, it waits for the GitHub Actions run (if the repo has workflows), fetches the configured URLs with cache-busting, and appends the verdict to the tool result. The latest verdict is also kept in module memory and injected into the prompt context, where later turns still see it.

```
tool.call Bash ─▶ detect.ts (deploy? CI only?) ─▶ next() runs the command
   ├─ no workflows ─▶ curl targets (retry inside the hook budget) ─▶ context on the result
   │                   └─ failed ─▶ clock watcher (15s x 12) ─▶ toast, verdict, follow-up prompt
   └─ workflows    ─▶ gh run list poller (15s, up to 20 min) ─▶ then the live check
verdict ─▶ module variable ─▶ prompt.context block "deployVerify"
```

## Files

| File | Role |
| --- | --- |
| `hooks/hooks.json` | Points at `./register.ts` |
| `hooks/register.ts` | Every hook, the probe, both watchers, `/deploy-verify` and the disable switch |
| `hooks/detect.ts` | Pure command detection: deploy patterns, quote and heredoc stripping, push branch, `gh` run URL |
| `tests/detect.test.ts` | Tests for command detection |
| `tests/register.test.ts` | Tests for the hooks, probes and watchers |
| `tsconfig.json` | Own tsconfig; its `include` points at `../.claude/types` |

## Events hooked

| Event (matcher) | What the hook does | Gating? |
| --- | --- | --- |
| `session.start` | Registers `/deploy-verify` unless disabled | No |
| `command.run` (`deploy-verify`) | `check` (default), `status` and `stop` | No (has no `.catch`) |
| `prompt.context` | Adds the last verdict as a `deployVerify` block | No |
| `turn.complete` | Marks the turn idle and sends a held follow-up | No |
| `tool.call` (`Bash`) | Runs the command, then appends advisories or verdicts as context | Yes (adds context; has a `.catch`) |

## Calls on $

| Call | Why |
| --- | --- |
| `$.process.run` | `curl` for the live check, `gh run list`, `git rev-parse` |
| `$.fs.exists`, `$.fs.read` | Read `.claude/deploy-verify.json`, `matchFile`, and test for `.github/workflows` |
| `$.session.repo`, `$.session.cwd` | Find the repo root |
| `$.clock.now`, `$.clock.sleep` | Time stamps, cache-busting value, retries inside the hook |
| `$.clock.after` | Self-rearming watchers and deferred follow-up |
| `$.command.register` | Adds `/deploy-verify` |
| `$.env.get` | Reads `CLAUDE_MODS_DISABLE` |
| `$.prompt.submit` | Sends the follow-up when a watch ends unverified |
| `$.ui.invalidate` | Refreshes `prompt.context` after each verdict |
| `$.ui.status`, `$.ui.toast`, `$.ui.log` | Progress, results and errors |

## State

- `$.state`: none.
- `$.store`: none.
- Module variables, lost on restart: the last verdict, the active watcher and its epoch, the follow-up flags, and a map of advisory hashes with a 10-minute cooldown.
- Files on disk: none written. Config is read from `<repo>/.claude/deploy-verify.json`.

## Drawing

No band or pane. It uses a status message (`verifying live deploy…`), toasts for status changes and the final result, log lines, tool-result context for the model, and a prompt-context block.

## Settings flow

No `userConfig`. Per-repo targets come from `.claude/deploy-verify.json`, read on every deploy and every `/deploy-verify` call. `CLAUDE_MODS_DISABLE` (`all` or a comma list naming `deploy-verify`) is read at session start; when it matches, hooks pass through and no command is registered.

## Testing

`tests/detect.test.ts` covers deploy, dry-run and quoted-command detection, push branches and `gh` URLs. `tests/register.test.ts` covers the hooks, the probe, CI watching and the commands. Run `claude plugin test mods/deploy-verify`.

## Known limits

- A deploy inside quotes (`ssh host "git push"`) is not detected, by design.
- The watchers run on timers in one process; closing the session ends them.
- CI watching needs `gh` logged in; the CI poll gives up after 20 minutes and the no-run wait after 3 minutes.
- The live watch covers 3 minutes (12 polls, 15 seconds apart).
- A hook that outruns its budget is dropped, so in-hook retries stop early and the timer watcher takes over.
- Never rename the plugin (`deploy-verify`) or the marketplace (`sandeep-mods`); existing installs use those names.

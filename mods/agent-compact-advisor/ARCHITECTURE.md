# Agent Compact Advisor: architecture

## Overview

Agent Compact Advisor keeps a small set of facts about the session (context size, leftovers from the last answer, the model check, Kev's probability) and a record of files the session wrote and what git says of them. At each redraw it combines them with running agents and background calls into one verdict, then draws it. A separate hook adds a preservation template to compaction instructions. It never compacts and never cancels a compaction.

```
session.measure / turn.complete ─▶ $.state facts ─┐
tool.call / turn.start ─▶ touched paths + git ($.process.run) ─▶ $.state recorded ─┤
$.agent.list + agent-shell-watch calls ────────────────────────────────────────────┤
                                                   hooks/model (pure) ─▶ verdict ─▶ status line, toast, prompt suggestion
session.compact ─▶ template added to instructions
```

## Files

| File | Role |
| --- | --- |
| `hooks/hooks.json` | Points at `./register.ts` |
| `hooks/register.ts` | Hooks, redraw timer, `/compact-advisor`, Kev request, model check |
| `hooks/record.ts` | Touched-paths list, git state, restore from the transcript |
| `hooks/quietly.ts` | Helpers that turn a failure into a fallback value |
| `hooks/model/` | Pure logic: `score`, `calls`, `config`, `drawn`, `format`, `kev`, `leftovers`, `offer`, `promise`, `steps`, `template`, `touched`, `unrecorded`, `words` |
| `types/index.d.ts` | Types for the mod's `$.state` and the shape it reads from agent-shell-watch |
| `engine-types/` | Copy of the Claude Code API declarations, used by `tsconfig.json`; copyright Anthropic PBC (see its NOTICE.md) |
| `tests/` | Behaviour tests, `tests/model/` for the pure logic, `tests/fixtures/` for shared setup |
| `scripts/`, `evals/`, `openspec/`, `demo/` | Upstream development material; not loaded by the mod |

## Events hooked

| Event (matcher) | What the hook does | Gating? |
| --- | --- | --- |
| `session.start` | Registers `/compact-advisor`, resets pending checks, starts the 30 s redraw, draws | No |
| `session.start` (`cwd` set) | Rebuilds the touched-paths list from the transcript and reads git once | No |
| `session.measure` | Stores the context size and redraws | No |
| `tool.call` | After a tool that can change files or commit, records paths and asks git | Passes through |
| `turn.start` | Asks git again | No |
| `turn.complete` (main conversation) | Stores the turn, runs the model check and Kev, redraws | No |
| `session.compact` | Adds the template to `instructions` for main-conversation compactions; stores the size after | Rewrites instructions |
| `command.run` (`compact-advisor`) | Returns the explanation of the score | Answers the command |

## Calls on $

| Call | Why |
| --- | --- |
| `$.http.fetch` | Posts the answer's end to Kev's System One (loopback only) |
| `$.model.complete` | The `haiku` check of the last answer (8 tokens, 15 s) |
| `$.process.run` | `git` read-only commands, 5 s limit each |
| `$.agent.list` | Counts running agents |
| `$.session.messages`, `$.session.root` | Restores touched paths on resume; finds the working folder |
| `$.state.get`, `$.state.set` | Facts, record, and the agent-shell-watch call list |
| `$.command.register` | Adds `/compact-advisor` |
| `$.clock.now`, `$.clock.every`, `$.clock.after`, `$.clock.sleep` | Cache age, the 30 s redraw, deferred settling, the Kev timeout |
| `$.ui.status`, `$.ui.toast`, `$.prompt.suggest` | The drawing |

## State

- `$.state` (`agent-compact-advisor.facts`): size, leftovers, Kev's P1, owner's question, model check, last turn time, and whether the score and alert were above their limits.
- `$.state` (`agent-compact-advisor.recorded`): time of the last git reading, counts of files and commits not recorded, and the absolute paths the session wrote to.
- `$.state` (`agent-shell-watch.calls`): read only, written by another mod. A value never written means that mod is absent.
- `$.store`: none.
- Files: none.

## Drawing

The status line (`$.ui.status`), toasts and a prompt suggestion (`$.prompt.suggest`). It draws no pane or band. A headless session has no status line.

## Settings flow

`configOf(options)` in `hooks/model/config.ts` reads the 14 `userConfig` values once at registration and applies defaults. `systemOneUrl` must match a loopback pattern, or Kev is switched off. Changes apply after a reload.

## Testing

`tests/` covers the score and gates, leftovers, the model check, Kev's request and reply, git-based recording, the compaction template, the coordinator setting and the hooks. No test uses the network; Kev is mocked through `http.fetch`. Run `claude plugin test mods/agent-compact-advisor`.

## Known limits

- Rules kept from upstream: a gate always wins over the score and the size alert; the model check can add a hold and never lift one; `hooks/model/` stays pure.
- A change made by another process shows at the next turn.
- Files outside a git repository count as unrecorded only when git supplies no state.
- A promise earlier than the last 6000 characters of the answer is beyond the model check.
- A subagent's transcript holds no tool records, so what its Bash calls changed is lost to a resume.
- A squash-merged branch counts as recorded only when its upstream is gone and its paths match origin's default branch as last fetched.
- Kev's host receives the answer's end; only loopback addresses are accepted.
- Tooling dropped in this copy: the upstream lint, format and release setup and its package files. The tests need none of it. To refresh `engine-types/`, copy the declarations Claude Code writes beside a mod loaded with `--plugin-dir`.
- Never rename the plugin (`agent-compact-advisor`) or the marketplace (`sandeep-mods`); existing installs and the `$.state` keys use those names.

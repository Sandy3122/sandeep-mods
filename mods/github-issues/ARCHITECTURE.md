# GitHub Issues: architecture

## Overview

GitHub Issues keeps one value per view in `$.state` (the issue list, the repository picker) and draws it in a side pane. Every read goes through `gh`, run with `$.process.run`; results are parsed in `lib.ts` and written back as a single state value so each change redraws once.

```
/issues, session.start, turn.complete, 2-minute timer ─▶ gh api graphql / gh issue view
                                                      ─▶ lib.ts parsers ─▶ $.state page / picker
                                                      ─▶ Pane (cards, tabs, search, labels, picker)
Work on it button ─▶ $.prompt.submit (workPrompt)
assigned issues   ─▶ $.store seen:<repo> ─▶ toast on new ones
```

## Files

| File | Role |
| --- | --- |
| `hooks/hooks.json` | Points at `./register.tsx` |
| `hooks/register.tsx` | The hooks, the `/issues` command, loading, the pane and its buttons |
| `hooks/lib.ts` | Pure helpers: `gh` arguments and GraphQL queries, parsers, label colors, card fitting, the work prompt |
| `types/index.d.ts` | Types for the mod's `$.state` |
| `tests/github-issues.test.ts` | Behaviour tests |
| `docs/issues.png`, `docs/picker.png` | Screenshots used by the README |

## Events hooked

| Event (matcher) | What the hook does | Gating? |
| --- | --- | --- |
| `session.start` | Registers `/issues`, clears an old status line, starts the 2-minute timer, reopens the pane if it was open | No |
| `command.run` (`issues`) | Parses the argument, sets the repository, opens the pane and loads issues or the picker | No |
| `turn.complete` | Refreshes the list after a main-loop turn when the pane is open | No |
| `ui.close` | Records that a person closed the pane | No (passes through) |
| `ui.render` (`Pane`, request id `github-issues`) | Draws the pane | No |

## Calls on $

| Call | Why |
| --- | --- |
| `$.process.run` | `gh --version` to find `gh`; `gh api graphql`; `gh issue view` (30 s timeout) |
| `$.session.repo`, `$.session.surfaces` | The session's repository; whether the spinner can tick |
| `$.state.get`, `$.state.set` | View, query, picker, pinned repository, page, search draft, open issue, active issue |
| `$.store.get`, `$.store.set` | Whether the pane was open; issue numbers seen per repository |
| `$.ui.open`, `.panes`, `.invalidate`, `.resolve`, `.status`, `.toast` | The pane, redraws, components, clearing the old status line, toasts |
| `$.command.register` | `/issues` |
| `$.clock.every`, `.now`, `.sleep` | Refresh timer, spinner, relative ages, hand-off timing |
| `$.prompt.submit` | Sends the **Work on it** prompt |

## State

- `$.state` (`github-issues.*`): `view`, `query`, `picker`, `pinned`, `page`, `searchDraft`, `open`, `active`.
- `$.store`: `isOpen` (pane left open) and `seen:<owner/name>` (issue numbers already seen as assigned to you).
- Files on disk: none.

## Drawing

One `Pane` titled Issues, with two views: the issue list (tabs, search, label picker, cards) and the repository picker. Cards are cut to fit a tree budget, with a note of how many are left out. The spinner ticks only on the terminal surface. Other surfaces get the same pane without it.

## Settings flow

There are no `userConfig` options. Limits (40 issues, 30 repositories, a 2-minute refresh) are constants in `lib.ts` and `register.tsx`.

## Testing

`tests/github-issues.test.ts` covers the parsers, queries, repository detection, card fitting, assignment alerts and the work prompt. Run `claude plugin test mods/github-issues`.

## Known limits

- Needs `gh`, signed in. Only GitHub.com-style `github.com` remotes are recognised.
- Shows at most 40 issues and 30 repositories.
- Alerts only run while the pane is open.
- `claude plugin validate` notes that the `ui.close` hook has no `.catch`; it only writes one store key.
- Never rename the plugin (`github-issues`) or the marketplace (`sandeep-mods`); existing installs and the `$.state` keys use those names.

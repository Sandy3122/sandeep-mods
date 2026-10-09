# Harness Scope: architecture

## Overview

Harness Scope reads a repo's `.claude/harness-scope.json`, which names a profile. It loads that profile once per conversation (from the user's profile folder, else a bundled one) and filters what Claude is offered: user instruction files, the skill listing, deferred tools, agent types and tool descriptions. A `tool.call` hook refuses calls to anything it hid. With no selector, or a broken profile, every hook passes through unchanged.

```
.claude/harness-scope.json ─▶ profile (user folder or bundled) ─▶ Active { keepSkill, keepAgent, keepFile, keepTool }
prompt.context ─▶ drop user instruction files      prompt.attachment ─▶ drop skills / deferred tools
agent.offer ─▶ isOffered: false                    tool.describe ─▶ isDeferred: true
tool.call ─▶ deny hidden tools and removed skills  receipt ─▶ /harness-scope, status line, screen log
```

## Files

| File | Role |
| --- | --- |
| `hooks/hooks.json` | Points at `./register.ts` |
| `hooks/register.ts` | The hooks, profile loading, the receipt, the `/harness-scope` command and status line |
| `hooks/profile.ts` | Pure parsing of selector and profile, glob rules, config directory lookup, `~/` expansion |
| `hooks/listing.ts` | Pure filters for the skill listing and the deferred tool list |
| `hooks/instructions.ts` | Pure filter for user instruction files, carrying a drop down an import chain |
| `hooks/bundled.ts` | The bundled `writing` profile |
| `.claude-plugin/icon.png` | Icon |

## Events hooked

| Event (matcher) | What the hook does | Gating? |
| --- | --- | --- |
| `classic.SessionStart` | On `clear` and `resume`, forgets the loaded profile and the receipt | No |
| `session.start` | Registers `/harness-scope` | No |
| `command.run` (`harness-scope`) | Returns the receipt, or the offered names for `names` | Yes (handles the command) |
| `prompt.context` | Removes `user` instruction files the profile turns off | No |
| `prompt.attachment` | Filters `skill_listing` and `deferred_tools_delta` text from the engine | No |
| `agent.offer` | Sets `isOffered: false` for agents the profile turns off, except `projectSettings` agents | Yes |
| `tool.describe` | Sets `isDeferred: true` for turned-off tools | No |
| `tool.call` | Denies turned-off tools and Skill calls for skills removed from the listing | Yes |

## Calls on $

| Call | Why |
| --- | --- |
| `$.command.register` | Adds `/harness-scope` |
| `$.fs.exists`, `$.fs.read` | Read the selector and the profile file |
| `$.session.root`, `$.session.repo` | Find the selector in the session folder or the git root |
| `$.session.surfaces` | Decide between text output and screen lines |
| `$.session.usage` | Skill names and sources, to align listing lines and spot the repo's own skills |
| `$.ui.log`, `$.ui.status` | Screen lines and the pinned status line |
| `$.plugin.root` | Work out the configuration directory from the install path |

## State

- `$.state`: not used. The loaded profile and receipt are module variables, reset on `/clear` and resume.
- `$.store`: not used.
- Files: none written.

## Drawing

No panes or bands. It sets the status line (`profile "<name>" on`) and logs lines to the screen. `/harness-scope` output goes to the model as text when there is no screen, else line by line to the screen log.

## Settings flow

`userConfig.configDir` arrives as `options.configDir` in `register`, with trailing slashes trimmed. If empty, `configDirFromPluginRoot` reads it off an install path containing `/plugins/cache/` or `/plugins/marketplaces/`. Profiles load from `<configDir>/harness-scope/profiles/<name>.json`, else from `bundled.ts`.

## Testing

No tests ship with this copy. Run `claude plugin validate --strict mods/harness-scope` to check the manifest and hooks. The pure modules (`profile.ts`, `listing.ts`, `instructions.ts`) are the natural place for tests.

## Known limits

- It relies on the skill listing format of Claude Code 2.1.287 and 2.1.294. On an unexpected format it passes the listing through and says so.
- Hooks `classic.SessionStart`, `command.run`, `agent.offer` and `tool.call` have no `.catch`; a thrown error is not turned into a pass-through there.
- Only `user` instruction files can be turned off.
- A profile applies from the next conversation or `/clear`.
- Never rename the plugin (`harness-scope`) or the marketplace (`sandeep-mods`); existing installs use those names.

# Harness Scope

Harness Scope hides the global skills, agents, instruction files and tools you choose in a repo, using a named profile that the repo selects.

Part of [Sandeep Mods](https://github.com/Sandy3122/sandeep-mods) · Context

## What it does

- Turns off global skills, agents, instruction files (rules in `~/.claude`) and tools in a repo, using a profile you write once and reuse.
- Keeps the repo's own skills, agents and CLAUDE.md. Project, local, managed and memory instruction files are never removed.
- Does nothing in a repo that has no `.claude/harness-scope.json`. That file can only name one of your profiles, so a cloned repo cannot turn off your rules.
- Removes turned-off skills from the skill listing and moves turned-off tools behind ToolSearch. It also refuses calls to them and says why.
- Adds `/harness-scope`, which lists what is off, what stayed, and any profile pattern that matched nothing.
- Ships one bundled profile, `writing`: only the repo's own skills, the Explore and general-purpose agents, and no LSP, NotebookEdit, EnterWorktree or ExitWorktree.

## Install

```
/plugin marketplace add Sandy3122/sandeep-mods
/plugin install harness-scope@sandeep-mods
```

## Use

1. Save a profile as `~/.claude/harness-scope/profiles/<name>.json`. Each of the four keys is optional, and each takes exactly one of `allow` or `deny`, with a list of names. `*` and `?` work as wildcards.

   ```json
   {
     "skills": { "allow": ["prose-translation", "anthropic-skills:docx"] },
     "instructions": { "deny": ["~/.claude/rules/common/testing.md"] },
     "tools": { "deny": ["mcp__github__*"] }
   }
   ```

   Keys: `skills`, `agents`, `instructions`, `tools`. In `instructions`, patterns match file paths and `~/.claude/` stands for your configuration directory.
2. In the repo, create `.claude/harness-scope.json` containing `{ "profile": "<name>" }`. Use `writing` to try the bundled profile. A profile file in your folder wins over a bundled one with the same name.
3. Start a new conversation or run `/clear`.

To check it:

- **Status line.** In a repo with a profile, the status line reads `profile "<name>" on`. Claude Code puts a warning sign in front of it. It is not a warning. One line on screen also says which file selected the profile. If both are missing in such a repo, the mod did not load.
- **`/harness-scope`.** Lists what is off and kept, and patterns that matched nothing (usually a typo).
- **`/harness-scope names`.** After one prompt, lists the skill, agent and tool names this conversation offered, so you know what to write in a profile.

To undo it, delete `.claude/harness-scope.json` and run `/clear`. To remove the mod, run `/plugin uninstall harness-scope@sandeep-mods`.

## Settings

| Option | Default | What it does |
| --- | --- | --- |
| `configDir` | empty | The Claude Code configuration directory that holds `harness-scope/profiles/`. Empty means the mod works it out from where it is installed. Set it when you load the mod with `--plugin-dir`. |

## Requirements

- Claude Code 2.1.287+ (terminal or desktop app Code tab).
- A profile file or the bundled `writing` profile. Without `configDir` and outside a normal install, only bundled profiles are found.

## What it can access

- **Hooks:** session start (to add `/harness-scope`), `/harness-scope`, instruction files, skill listing and deferred tool list attachments, agent offers, tool descriptions and every tool call. The tool call hook can refuse a call.
- **Reads:** the repo's `.claude/harness-scope.json` (in the session folder or the git root), the profile file in `<configDir>/harness-scope/profiles/`, and Claude Code's session usage, to tell the repo's own skills from global ones. The profile folder is outside the project.
- **Network and models:** none. It makes no network requests and calls no model.
- **Runs programs:** none. It reads no environment variables.
- **Writes files:** none. It does not move, edit or delete anything.
- **Screen:** it writes lines to the screen log and sets the status line.
- **Approvals:** it never approves anything. It only hides items and refuses calls to turned-off tools and skills.

## Troubleshooting

- **Nothing is hidden.** Check that `.claude/harness-scope.json` is valid and holds only `"profile"`, then run `/clear`. A broken selector or profile makes the mod pass everything through and say so on screen.
- **Profile not found.** The mod looks in `<configDir>/harness-scope/profiles/` and then the bundled profiles. If you loaded the mod with `--plugin-dir`, set the `configDir` option.
- **Skill listing passed through.** If the listing format is unexpected or the skills cannot be told apart, the mod leaves the listing alone and prints a note. `/harness-scope` shows it.
- **A pattern matches nothing.** Run `/harness-scope names` for the exact names and fix the profile.

## License

MIT; see LICENSE.

## Credits

Adapted and maintained by Sandeep as part of Sandeep Mods. Originally created by [shimo4228](https://github.com/shimo4228) in [shimo4228/harness-scope](https://github.com/shimo4228/harness-scope/tree/02225a09febf2fb0914857b6c532965e807e8e5c/plugin), MIT.

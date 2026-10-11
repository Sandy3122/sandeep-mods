# Mod standard

Every mod in Sandeep Mods looks the same from the outside: the same files, the same manifest fields, the same README and ARCHITECTURE sections. A user who has read one mod's folder knows where to find everything in the next.

Standardizing changes **how a mod is presented, never what it does.** Behaviour changes are separate work, in their own commits, with a version bump and a CHANGELOG entry.

## 1. Folder layout

```
mods/<name>/
├── .claude-plugin/
│   └── plugin.json          manifest (section 2)
├── hooks/
│   ├── hooks.json           { "modules": ["./register.ts"] } (or .tsx)
│   └── register.ts(x)       the hooks module, plus any modules it imports
├── types/index.d.ts         only if the mod keeps values in $.state
├── tests/                   at least one *.test.ts(x) for the main behaviour
├── assets/                  screenshots and GIFs used by the README (optional)
├── tsconfig.json            { "extends": "./.claude-plugin/types/tsconfig.json" }
├── README.md                for users (section 3)
├── ARCHITECTURE.md          for maintainers (section 4)
├── CHANGELOG.md             section 5
├── LICENSE                  the original license, kept (section 6)
└── UPSTREAM.json            adapted mods only; written by fetch_mods.py (section 8)
```

Keep anything else the mod needs at run time or for its tests (vendored libraries, skills/, commands/, agents/, data files). Move tests into `tests/` only if they still pass there.

**tsconfig.** The `extends` form is the default. Keep a mod's own tsconfig when its `include` covers folders the shared one doesn't, and check that `tsc -p .` and the tests give the same result before replacing one.

**Remove** what belonged to the upstream repository rather than to the mod: CI configs, release tooling (release-please, commitlint, lefthook, knip), linters and formatters (eslint, prettier, biome), lockfiles, and a root `CLAUDE.md` (Claude Code warns that a plugin root `CLAUDE.md` is not loaded), unless the mod's tests need them. Fold anything useful from an upstream `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md` or `SECURITY.md` into ARCHITECTURE.md, then delete them. Keep translations as `README.<lang>.md`; `README.md` is always English.

## 2. plugin.json

Fields in this order. Keep every other field the mod already has (`userConfig`, `types`, `dependencies`, `defaultEnabled`, `icon` and the like) exactly as it is.

```json
{
  "name": "<unchanged>",
  "displayName": "<Title Case Name>",
  "version": "<previous version, bumped on any change you make>",
  "description": "<one plain sentence: what the user gets>",
  "author": { "name": "Sandeep", "url": "https://github.com/Sandy3122" },
  "homepage": "https://github.com/Sandy3122/sandeep-mods/tree/main/mods/<name>#readme",
  "repository": "https://github.com/Sandy3122/sandeep-mods",
  "license": "<same as the original: MIT, Unlicense, ...>",
  "keywords": ["<3 to 8 lowercase words>"]
}
```

- **`name` stays as it is.** It is the install id (`<name>@sandeep-mods`), and many mods use it as a literal in `$.state` references (`{ plugin: '<name>', key: ... }`) and in `types/index.d.ts` (`interface PluginState { '<name>': ... }`). If a rename is ever required, change all of those together, then validate and test.
- **`displayName`**: Title Case of the name, with no brand prefix (`Blast Radius`).
- **`version`**: when you first standardize a mod, bump the patch number (0.2.0 → 0.2.1) so users who installed the original copy can tell them apart. Bump again on every release; users don't receive changes without a version change.
- **`description`**: one sentence, no marketing words, under 160 characters.
- **`author`** names the maintainer of this copy. The original author is credited in the README, CREDITS.md and LICENSE.

## 3. README.md

Written for someone deciding whether to install the mod. Sections in this order; leave a section out only when it has nothing to say. Lines 1 to 3 are always the same three.

````markdown
# <Display Name>

<One sentence: what it does for you.>

Part of [Sandeep Mods](https://github.com/Sandy3122/sandeep-mods) · <Category>

![<what the picture shows>](assets/<file>)        <- optional screenshot or GIF

## What it does
- <3 to 6 bullets, concrete>

## Install
```
/plugin marketplace add Sandy3122/sandeep-mods
/plugin install <name>@sandeep-mods
```

## Use
<commands it adds, keys, buttons, where it draws (band, pane, status line)>

## Settings
| Option | Default | What it does |       <- from userConfig; "None." if it has none

## Requirements
- Claude Code 2.1.287+ (terminal or desktop app Code tab)
- <OS limits, external tools such as gh, git, Python>

## What it can access
<From `claude plugin validate mods/<name>`: the events it hooks and the calls it makes, in plain words.
Say clearly if it runs programs, writes files, calls a model (costs tokens) or uses the network, and why.>

## Troubleshooting
- <the 2 to 4 problems people will actually hit>

## License
<license name>; see LICENSE.

## Credits
<Adapted mods:>
Adapted and maintained by Sandeep as part of Sandeep Mods. Originally created by <author>, <license>.
<Sandeep's own mods:>
Created and maintained by Sandeep as part of Sandeep Mods.
````

- **Credits is the last section** of every README.
- The category is one of: Cost and usage · Context · Safety · Workflow · Git and deploys · Viewing output.
- Write the README from reading the code, not by copying the original README. Never write or imply that Sandeep created an adapted mod.

## 4. ARCHITECTURE.md

Written for whoever changes the mod next. Sections in this order:

```markdown
# <Display Name>: architecture

## Overview
<A short paragraph and a small text diagram: events in, what is kept, what is drawn.>

## Files
| File | Role |

## Events hooked
| Event (matcher) | What the hook does | Gating? |
<"Gating" = can refuse or rewrite: tool.call, prompt.submit, command.run ...>

## Calls on $
| Call | Why |

## State
- $.state keys and what they hold
- $.store keys (kept across sessions)
- files written on disk

## Drawing
<Which sites it draws (AbovePrompt band, Pane, status line, toasts, transcript rows) and on which surfaces.>

## Settings flow
<How userConfig options reach the code.>

## Testing
<What the tests cover and how to run them: claude plugin test mods/<name>.>

## Known limits
- <surfaces where it doesn't draw, OS limits, edge cases>
```

## 5. CHANGELOG.md

```markdown
# Changelog

## <version> (<YYYY-MM-DD>)
- Imported from <owner/repo> at <commit, 7 characters>.
- Standardized: README, ARCHITECTURE, manifest metadata, layout. No behaviour change.
```

Newest version first. One bullet per user-visible change. A mod that came with its own changelog keeps its older entries below the new one.

## 6. LICENSE and credit (required)

- Keep the original LICENSE file and its original copyright line exactly. MIT and Apache-2.0 require the notice to stay with the code.
- Add one line under the original copyright line: `Copyright (c) <year> Sandeep (modifications)`, once.
- The Unlicense and other public-domain dedications ask for nothing and have no copyright line to sit under. Leave the file untouched and credit the author in the README and CHANGELOG.
- For Apache-2.0 mods, keep any NOTICE file and note your changes in CHANGELOG.md.
- A mod with no license file must not be published.

## 7. Checks before every commit

```bash
claude plugin validate --strict mods/<name>
claude plugin test mods/<name>                 # when the mod has tests
claude plugin validate --strict .              # the marketplace
```

Load the mod for a real session before publishing: `claude --plugin-dir mods/<name>`.

## 8. Upstream records

Each adapted mod has a `UPSTREAM.json` that `tools/fetch_mods.py` writes. The script and CREDITS.md read it, so:

- Never edit, move or delete it.
- Never mention, link or show it in user-facing text: the root README, a mod README, plugin or marketplace descriptions, CHANGELOGs. Maintainer files (`CLAUDE.md`, `docs/`, `tools/`) may refer to it.
- Write credits from its data (author, repository, source URL, license) without naming the file.

## 9. Brand and voice

The collection is **Sandeep Mods**, maintained by Sandeep (GitHub `Sandy3122`).

| Item | Value |
| --- | --- |
| Marketplace | `name` `sandeep-mods` (permanent); `owner` `{ "name": "Sandeep", "url": "https://github.com/Sandy3122" }`; `description` begins `Sandeep Mods:` |
| Install ids | `<plugin-name>@sandeep-mods` |
| Wording | "adapted and maintained by" for adapted mods; "created and maintained by" only for Sandeep's own mods |

The brand is carried by the marketplace, the author fields, the README brand line and the credits wording. Never rename plugins or commands to carry it.

Voice:
- Plain English, written to the reader as "you", present tense, short sentences, concrete nouns.
- Sentence-case headings.
- No hype words (powerful, seamless, supercharge, blazing), no emojis, no exclamation marks.
- Name features the way the interface does: band above the prompt, pane, status line, toast, `/command`.
- Say plainly what a mod can access: network calls, model calls (they cost tokens), programs it runs and files it writes.

## 10. Security review

Mods run with the user's permissions. While standardizing, read what the mod hooks and calls and confirm it matches its README. Flag, don't silently keep: network calls, model calls, processes started, files written outside the project, and any hook that approves tool calls.

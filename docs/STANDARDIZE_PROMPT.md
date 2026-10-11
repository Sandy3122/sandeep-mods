# Standardize a mod with Claude Code

Open Claude Code in the repository root (`cd sandeep-mods`, then `claude`) and paste one of these prompts. Do one mod per prompt and commit after each, so every change is easy to review and undo. `docs/MOD_STANDARD.md` is the authority; these prompts only say how to apply it.

## One mod

Replace `<NAME>` with the folder name under `mods/`.

```
Standardize the mod in mods/<NAME> to docs/MOD_STANDARD.md.

1. Read docs/MOD_STANDARD.md and every file in mods/<NAME>. For an adapted mod, read its upstream record for the author,
   source, commit and license (you may use it; never show or name it in user-facing text).
   Run `claude plugin validate mods/<NAME>` and note what the mod hooks and calls.
2. Do not change what the mod does. If something looks broken, list it at the end instead of fixing it.
3. Layout: match section 1. Remove upstream repository tooling the mod and its tests don't need.
   Fold anything useful from CLAUDE.md, AGENTS.md, CONTRIBUTING.md or SECURITY.md into ARCHITECTURE.md, then delete them.
   Ask before renaming or moving anything else.
4. plugin.json: match section 2. Keep `name`, userConfig, types and dependencies unchanged. Bump the patch version.
5. README.md: write it from the code, to sections 3 and 9, including "What it can access" and the Credits section
   with the exact wording for this kind of mod. Keep translations as README.<lang>.md.
6. ARCHITECTURE.md and CHANGELOG.md: write them per sections 4 and 5.
7. LICENSE: per section 6. Keep the original text and copyright line exactly. Keep any NOTICE file.
8. Run `claude plugin validate --strict mods/<NAME>` and, if there are tests, `claude plugin test mods/<NAME>`.
   Fix only what standardizing broke.
9. Finish with: the files you changed, added and removed; anything the mod can access that its old README didn't mention;
   and anything that looked broken.
```

## All mods

```
Go through every folder under mods/ that has no ARCHITECTURE.md yet, one at a time.
For each one, do everything in the "One mod" prompt of docs/STANDARDIZE_PROMPT.md, then commit it alone
with the message "Standardize <name>". Stop and ask me if a mod fails validation or its tests,
or if standardizing would require changing what the mod does.
After every five mods, compare their READMEs and ARCHITECTURE files side by side and fix any drift
in structure, headings or voice before continuing.
```

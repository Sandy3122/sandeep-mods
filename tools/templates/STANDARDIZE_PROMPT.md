# Standardize a mod with Claude Code

Open Claude Code in your collection folder (`cd {{REPO}}` then `claude`) and paste one of these prompts. Do one mod per prompt and commit after each, so every change is easy to review and undo.

## One mod

Replace `<NAME>` with the folder name under `mods/`.

```
Standardize the mod in mods/<NAME> to docs/MOD_STANDARD.md.

1. Read docs/MOD_STANDARD.md, mods/<NAME>/UPSTREAM.json and every file in mods/<NAME>.
   Run `claude plugin validate mods/<NAME>` and note what it hooks and calls.
2. Do not change what the mod does. If something looks broken, list it at the end instead of fixing it.
3. Layout: match section 1 of the standard. Remove upstream repo tooling the mod and its tests don't need.
   Fold anything useful from CLAUDE.md, AGENTS.md, CONTRIBUTING.md or SECURITY.md into ARCHITECTURE.md, then delete them.
4. plugin.json: match section 2. Keep `name`, userConfig, types and dependencies unchanged. Bump the patch version.
5. README.md: rewrite it from the code, in my voice, with the sections of section 3, including "What it can access"
   and a Credits section naming the original author from UPSTREAM.json. Keep translations as README.<lang>.md.
6. ARCHITECTURE.md and CHANGELOG.md: write them per sections 4 and 5.
7. LICENSE: keep the original text and copyright line exactly; add "Copyright (c) 2026 {{OWNER}} (modifications)" under it.
   Never touch UPSTREAM.json.
8. Run `claude plugin validate --strict mods/<NAME>` and, if there are tests, `claude plugin test mods/<NAME>`.
   Fix only what standardizing broke.
9. Finish with: the files you changed, added and removed; anything the mod can access that its old README didn't mention;
   and anything that looked broken.
```

## All mods, one after another

```
Go through every folder under mods/ that has no ARCHITECTURE.md yet, one at a time.
For each one, do everything in the "One mod" prompt of docs/STANDARDIZE_PROMPT.md, then commit it alone
with the message "Standardize <name>". Stop and ask me if a mod fails validation or its tests,
or if standardizing would require changing what the mod does.
```

## After standardizing

Regenerate the marketplace, the README's mod table and CREDITS.md (your edits to the mods are kept):

```bash
python tools/fetch_mods.py --out .
```

Then check everything and push:

```bash
claude plugin validate --strict .
git add -A && git commit -m "Standardize mods" && git push
```

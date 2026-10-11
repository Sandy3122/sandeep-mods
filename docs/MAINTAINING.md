# Maintaining Sandeep Mods

Run every command from the repository root. They use `tools/fetch_mods.py`, which needs Python 3.8+ and git 2.25+.

## Check which mods changed upstream

```
python tools/fetch_mods.py --out . --check-upstream
```

This reads the latest commit of each original repository and compares it with the commit recorded in the mod's `UPSTREAM.json`. It prints one line per mod:

- `up to date`: nothing new.
- `upstream has new commits: <link>`: open the link to see what changed.
- `could not reach <repo>`: the repository is offline, renamed or private.

It downloads nothing and changes no file. Some authors keep several mods in one repository, so a change to a different mod in that repository also shows as new commits.

## Regenerate the marketplace, README table and credits

```
python tools/fetch_mods.py --out .
```

Run this after you change a mod's name, description, version or category. It rewrites `.claude-plugin/marketplace.json`, the mod table in `README.md` and `CREDITS.md`. Mods already in `mods/` are left alone.

## Check a mod before you commit

```
claude plugin validate --strict mods/<name>
claude plugin test mods/<name>
claude plugin validate --strict .
```

The last line validates the marketplace.

## Pull a newer version of one mod

Read the compare link first. Then, to take the latest upstream commit into a scratch folder:

```
python tools/fetch_mods.py --out /tmp/upstream-check --only <name> --latest
```

Compare that copy with `mods/<name>` and carry over what you want by hand.

Do not run `--latest --force` against `.`. It replaces the mod folder with the original and discards the standardization and every change made here.

## After you change a mod

1. Bump the patch version in `.claude-plugin/plugin.json`.
2. Add a CHANGELOG entry.
3. Run the checks above.

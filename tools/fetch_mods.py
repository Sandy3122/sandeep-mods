#!/usr/bin/env python3
"""
fetch_mods.py - build your own Claude Code mod collection from open-source mods.

What it does
  1. Downloads each mod in MODS below from GitHub, at the exact commit listed
     (only that mod's folder, not the whole repository).
  2. Copies it into <out>/mods/<name>/, leaving out the upstream repository's
     git data, CI workflows and dev clutter.
  3. Keeps the original LICENSE in every mod folder (the license requires it)
     and records where the mod came from in mods/<name>/UPSTREAM.json.
  4. Writes the files that make <out> a Claude Code marketplace under your name:
     .claude-plugin/marketplace.json, README.md, CREDITS.md, LICENSE, CLAUDE.md,
     .gitignore and docs/ (the mod standard and the Claude Code prompt).
  5. Checks every mod: imports that point outside its folder, a missing license,
     and `claude plugin validate` when Claude Code is installed.

It copies itself into <out>/tools/ with your settings (tools/collection.json),
so later runs are just `python tools/fetch_mods.py --out .` from the collection.

Run it again at any time: mods already in <out>/mods are left alone (your edits
are safe) unless you pass --force, and the marketplace, the mod table in
README.md and CREDITS.md are regenerated from whatever is in mods/, including
mods you wrote yourself.

Requirements: Python 3.8+, git 2.25+ on PATH. Optional: Claude Code (`claude`).

Examples
  python fetch_mods.py --out my-claude-mods --owner "Sandeep" --github sandeep --repo my-claude-mods
  python fetch_mods.py --out my-claude-mods --only cctop,rabe
  python fetch_mods.py --out my-claude-mods --check-upstream
  python fetch_mods.py --out my-claude-mods --only rabe --latest --force
"""

import argparse
import datetime
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
from pathlib import Path

# ---------------------------------------------------------------------------
# The mods to collect. Edit this list freely: add, remove or re-pin entries.
#   name     the plugin name (the folder under mods/ gets this name)
#   repo     GitHub owner/repo
#   path     the mod's folder inside the repo ("" when the mod is the repo root)
#   commit   the exact commit to take (pinned so you review a known version)
#   license  the upstream license, for CREDITS.md
#   category how the collection README groups it
# Pinned on 2026-10-09; every entry passed `claude plugin validate` on Claude Code 2.1.295.
# ---------------------------------------------------------------------------
MODS = [
    {"name": "cctop", "repo": "tomstagl/cctop", "path": "plugin",
     "commit": "6ceafc34a972f4e58d5e53b1c69f80e2a9759d41", "license": "MIT", "category": "Cost and usage"},
    {"name": "flightdeck", "repo": "scasella/claude-flightdeck", "path": "",
     "commit": "f31daca523d36c501cd0df23a737a44c7dc56ad6", "license": "MIT", "category": "Cost and usage"},
    {"name": "context-view", "repo": "kongyo2/context-view", "path": "",
     "commit": "137e4e3db754684144ec953c5e66085bc2959766", "license": "MIT", "category": "Cost and usage"},
    {"name": "weektoken", "repo": "3dnow/claude-mods", "path": "weektoken",
     "commit": "9f0bf8e119a1444fc267b9553da88c6b444f3683", "license": "MIT", "category": "Cost and usage"},
    {"name": "agent-compact-advisor", "repo": "apolenkov/agent-compact-advisor", "path": "",
     "commit": "5486abec02ae09bda76750993a0f68ca61b76dbf", "license": "MIT", "category": "Context"},
    {"name": "micro-compaction", "repo": "ruihe774/cc-micro-compaction", "path": "",
     "commit": "7409c6265aa977c01cfd6b070af3c734f56fb467", "license": "Unlicense", "category": "Context"},
    {"name": "harness-scope", "repo": "shimo4228/harness-scope", "path": "plugin",
     "commit": "02225a09febf2fb0914857b6c532965e807e8e5c", "license": "MIT", "category": "Context"},
    {"name": "aside", "repo": "JayDoubleu/aside", "path": "",
     "commit": "cf2b7562ae7b376cdcf9e2436a926aba77dc759f", "license": "MIT", "category": "Context"},
    {"name": "blast-radius", "repo": "hamzafer/claude-code-mods", "path": "mods/blast-radius",
     "commit": "e687416b0f2df0f3ad7f4dfc2065eefe6bc17ea9", "license": "MIT", "category": "Safety"},
    {"name": "secret-redactor", "repo": "ray-amjad/awesome-claude-code-function-hooks", "path": "plugins/secret-redactor",
     "commit": "12b5fea27a4bd1b88cd9c9b6abc1efc0756c6625", "license": "MIT", "category": "Safety"},
    {"name": "launch-codes", "repo": "OneWave-AI/claude-code-mods", "path": "launch-codes",
     "commit": "e6da26ca36a88eec3be25605d30fa20f2c1c0cec", "license": "MIT", "category": "Safety"},
    {"name": "rabe", "repo": "lorenzh/rabe", "path": "",
     "commit": "8edd5cd579f49c2ca95128e815b8d16e002c2a2d", "license": "MIT", "category": "Workflow"},
    {"name": "receipt", "repo": "hoobnn/hoobnn-agent-mods", "path": "claude-code/receipt",
     "commit": "b95d1e454a76523e433fb37e5ca171e1f5576676", "license": "MIT", "category": "Workflow"},
    {"name": "todo-bar", "repo": "hoobnn/hoobnn-agent-mods", "path": "claude-code/todo-bar",
     "commit": "b95d1e454a76523e433fb37e5ca171e1f5576676", "license": "MIT", "category": "Workflow"},
    {"name": "pr-pulse", "repo": "gerricchaplin/pr-pulse", "path": "",
     "commit": "8bf587aaa9cb3815875dcc3818c8827a37e7cb78", "license": "MIT", "category": "Git and deploys"},
    {"name": "github-issues", "repo": "MarcoCarnevali/claude-code-mods", "path": "github-issues",
     "commit": "a3e528dd00ced34a46973ab89398cc52168191b9", "license": "MIT", "category": "Git and deploys"},
    {"name": "deploy-verify", "repo": "yash-gadodia/claude-mods", "path": "deploy-verify",
     "commit": "f4c1c751f67918c73f29977cbd52b8398f8556ac", "license": "MIT", "category": "Git and deploys"},
    {"name": "terminal-browser", "repo": "zenbu-labs/terminal-browser", "path": "claude-code-plugin",
     "commit": "2165ae76c9639e3996829ab0e6d54ddbd4f06ad8", "license": "MIT", "category": "Viewing output"},
    {"name": "md-preview", "repo": "hamzafer/claude-code-mods", "path": "mods/md-preview",
     "commit": "e687416b0f2df0f3ad7f4dfc2065eefe6bc17ea9", "license": "MIT", "category": "Viewing output"},
    {"name": "prismantis", "repo": "NahumLitvin/prismantis", "path": "",
     "commit": "9900aaa3aeb31ac728639f692a38354ce89949da", "license": "MIT", "category": "Viewing output"},
]

CATEGORY_ORDER = ["Cost and usage", "Context", "Safety", "Workflow", "Git and deploys", "Viewing output", "My mods"]

# Upstream files and folders that are not part of a mod: version control, the
# upstream repo's CI, local dev settings, dependencies and editor state.
SKIP_NAMES = {
    ".git", ".github", ".claude", "node_modules", ".DS_Store", "Thumbs.db",
    ".idea", ".vscode", "coverage", "dist",
}
LICENSE_PREFIXES = ("license", "licence", "copying", "unlicense")
CODE_SUFFIXES = (".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts")
IMPORT_RE = re.compile(
    r"""(?:^|[\s;])(?:import|export)\b[^'"]*?\bfrom\s*['"](\.{1,2}/[^'"]+)['"]|(?:^|[\s;])import\s*['"](\.{1,2}/[^'"]+)['"]""",
    re.MULTILINE,
)
README_START = "<!-- mods:start -->"
README_END = "<!-- mods:end -->"
HERE = Path(__file__).resolve().parent


# --------------------------------------------------------------------------- helpers

def say(text=""):
    print(text, flush=True)


def run(argv, cwd=None, check=True):
    result = subprocess.run(argv, cwd=cwd, capture_output=True, text=True)
    if check and result.returncode != 0:
        raise RuntimeError(f"{' '.join(argv)} failed:\n{result.stderr.strip() or result.stdout.strip()}")
    return result


def git_version():
    try:
        out = run(["git", "--version"]).stdout
    except (OSError, RuntimeError):
        return None
    match = re.search(r"(\d+)\.(\d+)", out)
    return (int(match.group(1)), int(match.group(2))) if match else (0, 0)


def remove_tree(path):
    """shutil.rmtree that also removes read-only files (git objects on Windows)."""
    def on_error(func, target, _info):
        os.chmod(target, stat.S_IWRITE)
        func(target)

    if path.exists():
        if sys.version_info >= (3, 12):
            shutil.rmtree(path, onexc=on_error)
        else:
            shutil.rmtree(path, onerror=on_error)


def today():
    return datetime.date.today().isoformat()


# --------------------------------------------------------------------------- downloading

def download(mod, workdir, latest, can_sparse):
    """Fetch one mod's repo at its pinned commit (or the latest default branch) into workdir."""
    url = f"https://github.com/{mod['repo']}.git"
    run(["git", "init", "-q"], cwd=workdir)
    run(["git", "remote", "add", "origin", url], cwd=workdir)
    ref = "HEAD" if latest else mod["commit"]
    fetched = False
    if can_sparse and mod["path"]:
        try:
            run(["git", "fetch", "-q", "--depth", "1", "--filter=blob:none", "origin", ref], cwd=workdir)
            run(["git", "sparse-checkout", "set", "--cone", mod["path"]], cwd=workdir)
            fetched = True
        except RuntimeError:
            fetched = False
    if not fetched:
        run(["git", "fetch", "-q", "--depth", "1", "origin", ref], cwd=workdir)
    run(["git", "checkout", "-q", "FETCH_HEAD"], cwd=workdir)
    return run(["git", "rev-parse", "HEAD"], cwd=workdir).stdout.strip()


def find_license(folder):
    return [p for p in folder.iterdir() if p.is_file() and p.name.lower().startswith(LICENSE_PREFIXES)]


def copy_mod(source, target, repo_root):
    def ignore(directory, names):
        skipped = {n for n in names if n in SKIP_NAMES}
        here = Path(directory)
        # The collection's own marketplace replaces each upstream marketplace file,
        # and Claude Code rewrites .claude-plugin/types whenever it loads a mod.
        if here.name == ".claude-plugin":
            skipped |= {n for n in names if n in ("marketplace.json", "types")}
        return skipped

    shutil.copytree(source, target, ignore=ignore)
    copied = find_license(target)
    if not copied:
        for license_file in find_license(repo_root):
            shutil.copy2(license_file, target / license_file.name)
            copied.append(target / license_file.name)
    return copied


# --------------------------------------------------------------------------- checks

def escaping_imports(folder):
    """Relative imports that point outside the mod folder or at nothing."""
    problems = []
    root = folder.resolve()
    for file in root.rglob("*"):
        if not file.is_file() or file.suffix not in CODE_SUFFIXES or "node_modules" in file.parts:
            continue
        text = file.read_text(encoding="utf-8", errors="ignore")
        for match in IMPORT_RE.finditer(text):
            spec = match.group(1) or match.group(2)
            target = (file.parent / spec).resolve()
            try:
                target.relative_to(root)
            except ValueError:
                problems.append(f"{file.relative_to(root)} imports {spec} (outside the mod folder)")
    return problems


def validate(folder, claude):
    if not claude:
        return "not validated (Claude Code not found, or --no-validate)"
    try:
        result = subprocess.run([claude, "plugin", "validate", str(folder)], capture_output=True, text=True, timeout=180)
    except (OSError, subprocess.TimeoutExpired) as error:
        return f"could not run: {error}"
    lines = [line.strip() for line in (result.stdout + result.stderr).splitlines()]
    verdict = [line for line in lines if line.startswith(("√", "✔", "×", "✘", "‼"))]
    return verdict[-1] if verdict else ("passed" if result.returncode == 0 else "failed")


# --------------------------------------------------------------------------- collection files

def plugin_manifest(folder):
    manifest = folder / ".claude-plugin" / "plugin.json"
    if not manifest.exists():
        return None
    try:
        return json.loads(manifest.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


def collect(out):
    """Every mod folder under mods/, with its manifest and upstream record."""
    found = []
    mods_dir = out / "mods"
    if not mods_dir.exists():
        return found
    for folder in sorted(p for p in mods_dir.iterdir() if p.is_dir()):
        manifest = plugin_manifest(folder)
        if manifest is None:
            continue
        upstream_file = folder / "UPSTREAM.json"
        upstream = json.loads(upstream_file.read_text(encoding="utf-8")) if upstream_file.exists() else None
        found.append({"folder": folder, "manifest": manifest, "upstream": upstream})
    return found


def one_line(text, limit=160):
    text = " ".join(str(text or "").split())
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def write_marketplace(out, mods, args):
    data = {
        "name": args.marketplace,
        "description": f"Claude Code mods collected, standardized and maintained by {args.owner}",
        "owner": {"name": args.owner},
        "plugins": [
            {
                "name": mod["manifest"].get("name", mod["folder"].name),
                "source": f"./mods/{mod['folder'].name}",
                "description": one_line(mod["manifest"].get("description", "")),
            }
            for mod in mods
        ],
    }
    target = out / ".claude-plugin" / "marketplace.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def category_of(mod):
    upstream = mod["upstream"]
    return (upstream or {}).get("category") or "My mods"


def mod_table(mods, args):
    lines = []
    for category in CATEGORY_ORDER + sorted({category_of(m) for m in mods} - set(CATEGORY_ORDER)):
        group = [m for m in mods if category_of(m) == category]
        if not group:
            continue
        lines += [f"### {category}", "", "| Mod | What it does | Install |", "| --- | --- | --- |"]
        for mod in group:
            name = mod["manifest"].get("name", mod["folder"].name)
            link = f"[{name}](mods/{mod['folder'].name})"
            what = one_line(mod["manifest"].get("description", ""), 200).replace("|", "\\|")
            lines.append(f"| {link} | {what} | `/plugin install {name}@{args.marketplace}` |")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


README_TEMPLATE = """# {title}

Claude Code mods I use every day, collected in one place, reviewed, and made consistent: every mod has the same layout, a README, an ARCHITECTURE.md and a CHANGELOG.

## Install

Add this marketplace once, inside Claude Code:

```
/plugin marketplace add {github}/{repo}
```

Then install any mod from the list below, for example:

```
/plugin install {example}@{marketplace}
```

Or from your shell: `claude plugin marketplace add {github}/{repo}`, then `claude plugin install <mod>@{marketplace}`.

Mods need Claude Code 2.1.287 or newer, in the terminal or the desktop app's Code tab. A mod runs with your permissions, so read its README (the "What it can access" section) before installing.

## Mods

{start}
{table}{end}

## Updating

`claude plugin update <mod>@{marketplace}`, or turn on auto-update for this marketplace in `/plugin` → Marketplaces.

## Credits

Many of these mods started as open-source projects by other authors. Each mod folder keeps its original license, and [CREDITS.md](CREDITS.md) lists every original author, source and license.

## License

Each mod is under the license in its own folder. Everything else in this repository: [MIT](LICENSE) © {year} {owner}.
"""

LICENSE_TEMPLATE = """MIT License

Copyright (c) {year} {owner}

This license covers the files of this repository that are not inside mods/.
Each folder under mods/ is under the license file in that folder, which keeps
its original authors' copyright notices.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"""

CLAUDE_MD_TEMPLATE = """# {title}

This repository is a Claude Code plugin marketplace: one mod per folder under `mods/`.

- Every mod follows `docs/MOD_STANDARD.md`. Read it before changing a mod.
- To standardize a mod, follow `docs/STANDARDIZE_PROMPT.md`.
- Never edit or delete a mod's `LICENSE` text or `UPSTREAM.json`; only add the maintainer's copyright line as the standard says.
- Don't change a plugin's `name` unless asked: users' installs and the mod's `$.state` keys depend on it.
- `.claude-plugin/marketplace.json`, the mod table in `README.md` and `CREDITS.md` are generated by `python tools/fetch_mods.py --out .`; run it instead of editing them by hand.
- Before committing a mod: `claude plugin validate --strict mods/<name>` and `claude plugin test mods/<name>`.
"""

GITIGNORE = """# Written by Claude Code whenever it loads a mod for development
.claude-plugin/types/
node_modules/
.DS_Store
Thumbs.db
"""


def write_if_missing(path, text):
    if path.exists():
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return True


def write_collection_files(out, mods, args):
    title = args.title or f"{args.owner}'s Claude Code mods"
    year = datetime.date.today().year
    example = next((m["manifest"].get("name") for m in mods), "cctop")
    table = mod_table(mods, args)
    fields = dict(title=title, owner=args.owner, github=args.github, repo=args.repo, marketplace=args.marketplace,
                  example=example, year=year, start=README_START, end=README_END, table=table)

    readme = out / "README.md"
    if not write_if_missing(readme, README_TEMPLATE.format(**fields)):
        text = readme.read_text(encoding="utf-8")
        if README_START in text and README_END in text:
            head, rest = text.split(README_START, 1)
            _, tail = rest.split(README_END, 1)
            readme.write_text(f"{head}{README_START}\n{table}{README_END}{tail}", encoding="utf-8")
        else:
            say(f"  note: README.md has no {README_START} … {README_END} markers, so its mod table was not updated")

    write_if_missing(out / "LICENSE", LICENSE_TEMPLATE.format(**fields))
    write_if_missing(out / "CLAUDE.md", CLAUDE_MD_TEMPLATE.format(**fields))
    write_if_missing(out / ".gitignore", GITIGNORE)
    for name in ("MOD_STANDARD.md", "STANDARDIZE_PROMPT.md"):
        template = HERE / "templates" / name
        if template.exists():
            text = template.read_text(encoding="utf-8")
            text = (text.replace("{{OWNER}}", args.owner).replace("{{GITHUB}}", args.github)
                    .replace("{{REPO}}", args.repo).replace("{{MARKETPLACE}}", args.marketplace))
            write_if_missing(out / "docs" / name, text)
        else:
            say(f"  note: templates/{name} not found next to the script; docs/{name} not written")

    rows = ["# Credits", "",
            "These mods are based on open-source work by the authors below. Each mod folder keeps the original license; "
            "changes made in this collection are listed in each mod's CHANGELOG.md.", "",
            "| Mod | Original author | Source | Commit | License |", "| --- | --- | --- | --- | --- |"]
    originals = []
    for mod in mods:
        up = mod["upstream"]
        name = mod["manifest"].get("name", mod["folder"].name)
        if not up:
            originals.append(name)
            continue
        rows.append(f"| {name} | [{up['author']}](https://github.com/{up['author']}) | [{up['repo']}]({up['url']}) | "
                    f"`{up['commit'][:7]}` | {up['license']} |")
    if originals:
        rows += ["", f"Original work by {args.owner}: " + ", ".join(originals) + "."]
    (out / "CREDITS.md").write_text("\n".join(rows) + "\n", encoding="utf-8")


# --------------------------------------------------------------------------- commands

def install_tools(out, args):
    """Keep this script, its templates and your settings inside the collection, so it maintains itself."""
    tools = out / "tools"
    (tools / "templates").mkdir(parents=True, exist_ok=True)
    script = Path(__file__).resolve()
    if script != (tools / script.name).resolve():
        shutil.copy2(script, tools / script.name)
        for template in (HERE / "templates").glob("*.md"):
            shutil.copy2(template, tools / "templates" / template.name)
    settings = {"owner": args.owner, "github": args.github, "repo": args.repo,
                "marketplace": args.marketplace, "title": args.title}
    (tools / "collection.json").write_text(json.dumps(settings, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def check_upstream(out):
    mods = [m for m in collect(out) if m["upstream"]]
    if not mods:
        say("No mods with UPSTREAM.json found.")
        return 0
    say(f"Checking {len(mods)} mods against their upstream repositories…\n")
    changed = 0
    for mod in mods:
        up = mod["upstream"]
        result = run(["git", "ls-remote", f"https://github.com/{up['repo']}.git", "HEAD"], check=False)
        latest = result.stdout.split()[0] if result.returncode == 0 and result.stdout else None
        name = mod["manifest"].get("name", mod["folder"].name)
        if latest is None:
            say(f"  {name:24} could not reach {up['repo']}")
        elif latest == up["commit"]:
            say(f"  {name:24} up to date")
        else:
            changed += 1
            say(f"  {name:24} upstream has new commits: https://github.com/{up['repo']}/compare/{up['commit'][:12]}...{latest[:12]}")
    say(f"\n{changed} mod(s) changed upstream. Review the compare links; nothing was downloaded.")
    return 0


def fetch(args):
    version = git_version()
    if version is None:
        say("git was not found. Install git (https://git-scm.com) and run this again.")
        return 1
    can_sparse = version >= (2, 25)
    out = Path(args.out).resolve()
    (out / "mods").mkdir(parents=True, exist_ok=True)
    claude = None if args.no_validate else shutil.which("claude")

    wanted = MODS
    if args.only:
        names = {n.strip() for n in args.only.split(",") if n.strip()}
        unknown = names - {m["name"] for m in MODS}
        if unknown:
            say(f"Not in the list: {', '.join(sorted(unknown))}")
            return 1
        wanted = [m for m in MODS if m["name"] in names]

    say(f"Collection: {out}")
    say(f"Mods to fetch: {len(wanted)}{' (latest commits)' if args.latest else ' (pinned commits)'}\n")
    failures = []
    for mod in wanted:
        target = out / "mods" / mod["name"]
        if target.exists() and not args.force:
            say(f"  {mod['name']:24} already in mods/, kept as is (use --force to download again)")
            continue
        with tempfile.TemporaryDirectory(prefix="fetch-mod-") as temp:
            workdir = Path(temp)
            try:
                commit = download(mod, workdir, args.latest, can_sparse)
            except RuntimeError as error:
                failures.append(mod["name"])
                say(f"  {mod['name']:24} FAILED to download: {str(error).splitlines()[-1]}")
                continue
            source = workdir / mod["path"] if mod["path"] else workdir
            if not (source / ".claude-plugin" / "plugin.json").exists():
                failures.append(mod["name"])
                say(f"  {mod['name']:24} FAILED: no .claude-plugin/plugin.json at {mod['path'] or 'the repo root'}")
                continue
            if target.exists():
                remove_tree(target)
            licenses = copy_mod(source, target, workdir)
            remove_tree(workdir / ".git")
        upstream = {
            "name": mod["name"],
            "repo": mod["repo"],
            "path": mod["path"],
            "url": f"https://github.com/{mod['repo']}" + (f"/tree/{commit}/{mod['path']}" if mod["path"] else f"/tree/{commit}"),
            "commit": commit,
            "author": mod["repo"].split("/")[0],
            "license": mod["license"],
            "category": mod["category"],
            "fetched": today(),
            "note": "Written by fetch_mods.py. Records where this mod came from; keep it.",
        }
        (target / "UPSTREAM.json").write_text(json.dumps(upstream, indent=2) + "\n", encoding="utf-8")
        license_note = ", ".join(p.name for p in licenses) if licenses else "NO LICENSE FOUND - do not publish"
        say(f"  {mod['name']:24} fetched {commit[:7]}  license: {license_note}")

    install_tools(out, args)
    mods = collect(out)
    write_marketplace(out, mods, args)
    write_collection_files(out, mods, args)

    say(f"\nChecking {len(mods)} mod(s){' with claude plugin validate' if claude else ''}…\n")
    problems = 0
    for mod in mods:
        folder = mod["folder"]
        issues = escaping_imports(folder)
        if not find_license(folder):
            issues.append("no LICENSE file")
        verdict = validate(folder, claude)
        if verdict.startswith(("×", "✘", "failed", "could not")):
            issues.append(f"validate: {verdict}")
        mark = "ok " if not issues else "!! "
        problems += bool(issues)
        say(f"  {mark}{folder.name:24} {verdict}")
        for issue in issues:
            say(f"       - {issue}")
    if claude:
        say(f"\n  marketplace: {validate(out, claude)}")

    say("")
    if failures:
        say(f"Could not fetch: {', '.join(failures)}. Run again with --only {','.join(failures)} to retry.")
    say(f"Done. {len(mods)} mod(s) in {out / 'mods'}; {problems} need attention.")
    say("Next: open the folder in Claude Code and follow docs/STANDARDIZE_PROMPT.md, one mod at a time.")
    say("Later runs, from inside the collection: python tools/fetch_mods.py --out .")
    return 1 if failures else 0


def main():
    parser = argparse.ArgumentParser(description="Build a Claude Code mod collection under your own name.")
    parser.add_argument("--out", default="my-claude-mods", help="collection folder (your GitHub repo's folder)")
    parser.add_argument("--owner", help="your name, as maintainer")
    parser.add_argument("--github", help="your GitHub username")
    parser.add_argument("--repo", help="the GitHub repository name")
    parser.add_argument("--marketplace", help="marketplace name users install from (kebab-case, permanent)")
    parser.add_argument("--title", help="title for the collection README")
    parser.add_argument("--only", help="comma-separated mod names to fetch")
    parser.add_argument("--force", action="store_true", help="download again even if the mod is already in mods/ (overwrites your edits)")
    parser.add_argument("--latest", action="store_true", help="take the latest commit instead of the pinned one")
    parser.add_argument("--check-upstream", action="store_true", help="only report which mods changed upstream")
    parser.add_argument("--no-validate", action="store_true", help="skip claude plugin validate")
    args = parser.parse_args()

    # Settings given once are remembered in <out>/tools/collection.json.
    saved_file = Path(args.out).resolve() / "tools" / "collection.json"
    saved = json.loads(saved_file.read_text(encoding="utf-8")) if saved_file.exists() else {}
    defaults = {"owner": "YOUR NAME", "github": "YOUR-GITHUB-USERNAME", "repo": "my-claude-mods",
                "marketplace": "my-claude-mods", "title": None}
    for key, fallback in defaults.items():
        if getattr(args, key) is None:
            setattr(args, key, saved.get(key, fallback))

    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", args.marketplace):
        say("--marketplace must be kebab-case, for example sandeep-mods")
        return 1
    if args.check_upstream:
        return check_upstream(Path(args.out).resolve())
    return fetch(args)


if __name__ == "__main__":
    sys.exit(main())

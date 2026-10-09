# MD Preview: architecture

## Overview

MD Preview records every Markdown file Claude changes, with the text from before the turn's first edit and which top-level blocks changed. It draws a pane that shows the file as a page (GitHub's renderer or a built-in one, drawn to PNG by headless Chrome) or as styled text.

```
tool.call Write/Edit/MultiEdit (.md) ─▶ changed() ─▶ $.state files ─▶ toast, draw ahead
tool.call Bash/PowerShell            ─▶ git snapshot ─▶ compare at turn.complete ─▶ changed()
/md, pane keys                       ─▶ $.state shown/pair/compare/view
page  ─▶ gh api /markdown or md.ts ─▶ page.ts HTML ─▶ sh + Chrome ─▶ PNG parts ─▶ Image in Pane
text  ─▶ md.ts toLines ─▶ Text rows in Pane
```

## Files

| File | Role |
| --- | --- |
| `hooks/hooks.json` | Points at `./register.tsx` |
| `hooks/register.tsx` | Hooks, command, pane, drawing queue, GitHub and Chrome calls |
| `hooks/md.ts` | Built-in Markdown parser, HTML and text-line output, changed-block detection |
| `hooks/page.ts` | The HTML page and GitHub-dark CSS Chrome draws |
| `types/index.d.ts` | Types for the mod's `$.state` |
| `tests/md-preview.test.tsx` | Behaviour tests |

## Events hooked

| Event (matcher) | What the hook does | Gating? |
| --- | --- | --- |
| `session.start` | Stores cwd and home, detects an image terminal, registers `md` (or `mdview`) | No |
| `turn.start` | Clears per-turn tracking (main agent only) | No |
| `turn.complete` | Compares the shell snapshot, then draws changed files ahead | No |
| `tool.call` | Takes a snapshot before a turn's first shell call; for Markdown edits, reads the file before and after the call and records the change | Observes only; passes the call through |
| `command.run` (`md`) | Opens or updates the pane; `compare`, `open`, `<path>` | Handles the command |
| `command.run` (`mdview`) | Same, as a fallback name | Handles the command |
| `ui.render` (`Pane`, `md-preview`) | Draws the pane | No |

## Calls on $

| Call | Why |
| --- | --- |
| `$.command.register` | `/md`, falling back to `/mdview` |
| `$.env.get` | `HOME`, `TERM`, `TERM_PROGRAM`, `TMUX`, `TMPDIR` |
| `$.fs.read`, `$.fs.exists`, `$.fs.write` | Read Markdown, find Chrome and the opener, write pages |
| `$.process.run` | `git`, `gh`, `sh` with Chrome, `open` or `xdg-open` |
| `$.state.get`, `$.state.set` (via `read`, `update`) | Pane state |
| `$.clock.now`, `$.clock.after` | GitHub back-off, a 300 ms delay before drawing |
| `$.ui.open`, `.close`, `.panes`, `.resolve`, `.toast` | Pane and toasts |

## State

- `$.state` (`md-preview.*`): `files` (path, time, changed blocks, earlier text for the latest 5), `shown`, `pair`, `compare`, `frame` (the drawing on screen), `view` (`page` or `text`), `note`.
- `$.store`: not used.
- Module memory, lost on reload: the drawing cache (20 drawings), the draw-ahead queue (5 files), repo lookups, GitHub failure flags, the shell snapshot.
- Files: `<TMPDIR>/md-preview/page-N.html`, `frame-N/part-K.png`, `open-N.html` (five in turn) and a `chrome/` profile.

## Drawing

The `Pane` component, titled "Markdown". The image view is used only on the terminal surface with an image-capable terminal (Ghostty, iTerm2, WezTerm, kitty; not tmux) and a found Chrome. Pages taller than 250 rows are cut into parts. Everything else gets the text view, up to 3000 lines.

## Settings flow

None. Limits are constants in `register.tsx` (file counts, sizes, timeouts).

## Testing

`tests/md-preview.test.tsx` covers edit tracking, shell snapshots, GitHub and built-in rendering, drawing ahead and the cache, compare, the browser open, failure handling, and the Markdown parser. Run `claude plugin test mods/md-preview`.

## Known limits

- The page view does not draw in tmux, other terminals, or the desktop app; those get the text view.
- Chrome paths are fixed to common macOS and Linux locations; no Windows paths.
- Shell-written Markdown is caught only in a git repository, up to 200 files.
- Earlier text is kept only for the latest 5 files and files up to 400 KB.
- Files over about 390 KB use the built-in renderer.
- `validate` reports the `tool.call` and both `command.run` hooks as gating hooks without `.catch`.
- Never rename the plugin (`md-preview`) or the marketplace (`sandeep-mods`); existing installs and the `$.state` keys use those names.

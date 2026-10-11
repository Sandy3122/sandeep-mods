# MD Preview

MD Preview shows the Markdown files Claude edits, rendered like GitHub, in a pane next to the chat.

Part of [Sandeep Mods](https://github.com/Sandy3122/sandeep-mods) · Viewing output

## What it does

- Watches Claude's `Write`, `Edit` and `MultiEdit` calls on `.md`, `.mdx` and `.markdown` files, and shows a toast when one changes.
- Opens a pane with the file rendered as a page, in GitHub's dark look. Blocks changed by the last edit get a green bar.
- Shows a file before and after its last edit side by side, or any two files side by side.
- Catches Markdown written by shell commands such as `cat > README.md`, inside a git repository.
- Draws changed files in the background when a turn ends, so the pane opens on a page that is already drawn.
- Opens the same page full size in your own browser.

## Install

```
/plugin marketplace add Sandy3122/sandeep-mods
/plugin install md-preview@sandeep-mods
```

## Use

- `/md` opens the pane on the latest Markdown file Claude changed. If `/md` is taken by a built-in command, the mod registers `/mdview` instead.
- `/md <path>` opens a file you name. `~/` and relative paths work.
- `/md compare <a> <b>` shows two files side by side, with what the second adds marked green.
- `/md open` opens the current page in your browser.
- Pane keys: `p` previous file, `n` next file, `b` before and after (press again for a single view), `r` render again, `t` switch between page and text, `o` open in the browser, `q` close.
- The page view needs a terminal that draws images: Ghostty, iTerm2, WezTerm or kitty, and not inside tmux. Elsewhere, and in the desktop app, the pane shows a text view with the same green bars.

## Settings

None.

## Requirements

- Claude Code 2.1.287+ (terminal or desktop app Code tab).
- For the page view: Google Chrome, Chromium, Microsoft Edge or Brave, in a standard install path on macOS or Linux, and an image-capable terminal. Without them you get the text view.
- Optional: git, to catch shell-written files and detect a GitHub repo; the `gh` CLI signed in, to render with GitHub.
- `open` (macOS) or `xdg-open` (Linux) for the browser button.

## What it can access

- **Hooks:** session start (registers `/md`), turn start and end, every tool call (it only reads the file path of `Write`, `Edit` and `MultiEdit`, and notes shell calls), the `/md` and `/mdview` commands, and the pane.
- **Reads files:** the Markdown file being edited, read just before the write lands; the files you open; and, in a git repo, every tracked or untracked Markdown file (up to 200) before the turn's first shell command, to spot changes.
- **Runs programs:**
  - `git ls-files` and `git remote -v` to list Markdown files and find a GitHub repo.
  - `gh api -X POST /markdown` to render with GitHub.
  - Headless Chrome, with its own throwaway profile, to draw the page to PNG.
  - `open` or `xdg-open` for the browser.
  - A small `sh` script that drives Chrome and closes only the Chrome it started.
- **Network:** only through `gh`. When the file is in a GitHub repository and `gh` is signed in, the file's text is sent to GitHub's Markdown API. Files outside a GitHub repo are never sent. If `gh` fails, the mod uses its built-in renderer for a minute. Chrome loads a local page file; images in your Markdown that point to the web may be fetched by Chrome or your browser.
- **Writes files:** HTML pages and PNG drawings under `md-preview/` in your temp folder (`TMPDIR`, or `/tmp`). It never edits your Markdown files.
- **Models:** it calls no model and costs no tokens. It never approves, denies or changes a tool call.

## Troubleshooting

- **The pane shows text, not a page.** Page view needs Chrome (or Chromium, Edge, Brave) and an image terminal, and does not work inside tmux. Press `t` to switch views and `r` to try again.
- **"Could not draw the page."** Chrome failed or timed out. Press `r`. The text view still works.
- **The page does not look like GitHub.** The mod falls back to a built-in renderer when the file is not in a GitHub repo, `gh` is signed out, or the file is over about 390 KB. The pane header says which renderer drew the page.
- **A shell-written file is not noticed.** This works only in a git repository, and only when the turn ran a shell command.
- **`/md` does nothing.** Check `claude --version` is 2.1.287 or newer, and that `md-preview` is not listed under **Errors** in `/plugin`.

## License

MIT; see LICENSE.

## Credits

Adapted and maintained by Sandeep as part of Sandeep Mods. Originally created by hamzafer, MIT.

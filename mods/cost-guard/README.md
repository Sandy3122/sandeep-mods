# Cost Guard

**See what Claude Code costs while you work, and spend less of it.**

Cost Guard is a [Claude Code mod](https://code.claude.com/docs/en/plugins/mods/overview). It puts a live cost meter above your prompt, tells you when a chat has grown long enough that every message is expensive, warns you about heavy input, and turns PDFs, Word, PowerPoint and Excel files into markdown before Claude reads them.

It was built for teams that share Claude and want everyone to know what they are spending, but it works just as well for one person.

```
Spend · this chat ≈$1.84 · last reply $0.21 · today $6.40 · context 92k of 200k (46%)
This chat is getting long: each message now re-sends about 92k tokens. Your last reply cost $0.21.
When you switch topics, start a fresh session (/clear).
[ Hide ]
```

*The meter above the prompt (example figures).*

## Contents

- [Features](#features)
- [Where it works](#where-it-works)
- [Requirements](#requirements)
- [Install](#install)
- [Install a document converter](#install-a-document-converter)
- [Check that it works](#check-that-it-works)
- [Using Cost Guard](#using-cost-guard)
- [Settings](#settings)
- [Updating](#updating)
- [Turning it off and uninstalling](#turning-it-off-and-uninstalling)
- [Privacy and security](#privacy-and-security)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Features

**A cost meter above the prompt.** After every reply it shows what this chat has cost, what the last reply cost, what you have spent today across all your sessions on this machine, and how full the context window is. On a subscription it also shows how much of your plan's usage window you have used. The same figures appear in short in your status line.

**A nudge to start fresh.** Claude re-sends the whole conversation with every message, so a long chat makes every reply more expensive. The meter turns yellow when a chat passes 80k tokens or $5, and red at 150k tokens. At red it offers a **Handoff** button: Claude writes a short `HANDOFF.md` with the goal, decisions, files and next steps, and you run `/clear` and continue in a fresh, cheap session. If you prefer, Cost Guard can also hold your next message once at the red level and put your text back in the box, so you decide before paying for it.

**Warnings on heavy input.** A long paste, documents attached directly to a message, three or more images, or a large `@`-mentioned file each get a short warning with the approximate token count, because whatever you add stays in the chat and is re-sent with every later message.

**Documents become markdown.** When you `@`-mention a document, or Claude reads one, Cost Guard converts it to a markdown copy beside the original (`report.docx` becomes `report.docx.md`) and Claude reads that instead. Supported: PDF, Word (`.docx`), PowerPoint (`.pptx`), Excel (`.xlsx`, `.xls`), OpenDocument (`.odt`, `.odp`, `.ods`), RTF and EPUB. Copies are reused until the original changes. A large copy is attached as a preview of its first 300 lines, with its path so Claude can read further only if it needs to. A scanned PDF with no text layer is left alone, and if Claude truly needs a PDF's pictures or layout it can read the original again.

**`/spend`.** Type `/spend` for this chat's cost, the last and priciest reply, the context size, today's total and the last 7 days, plus the documents read as markdown.

**Your currency.** Optionally show a local figure beside dollars, for example `$1.84 (₹155)`.

## Where it works

Mods run in Claude Code, not in the claude.ai chat or the Claude mobile app.

| Where you run Claude Code | Meter, status line, toasts | Markdown conversion, `/spend`, warnings in the transcript |
| --- | --- | --- |
| `claude` in a terminal (including an editor's terminal and JetBrains) | Yes | Yes |
| Code tab of the Claude desktop app (local sessions) | Yes | Yes |
| VS Code extension chat panel | No (mods don't draw there) | Yes |
| `claude -p` and the Agent SDK | No | Yes |
| Cloud sessions, WSL sessions in the desktop app | No | Only where plugins load |

## Requirements

- **Claude Code 2.1.287 or newer** in the terminal, or the desktop app with Claude Code 2.1.286 or newer. Check with `claude --version`, or `/status` in the desktop app's Code tab.
- **A document converter** for the markdown feature (optional): [markitdown](https://github.com/microsoft/markitdown) is recommended; pandoc or poppler's `pdftotext` also work. See [Install a document converter](#install-a-document-converter).
- Windows, macOS or Linux: anything Claude Code runs on.

## Install

Pick one route. Each installs the plugin `cost-guard` from the marketplace `sandeep-mods`, which is this repository.

### Option 1: one line, inside Claude Code (recommended)

Needs Claude Code 2.1.275 or newer. At the Claude Code prompt, type:

```
/plugin install cost-guard --marketplace YOUR-GITHUB-USERNAME/claude-mods
```

1. Confirm adding the marketplace when asked.
2. Review what the plugin adds, then choose **Install for you (user scope)** so it runs in every project.
3. When you see `Plugin is now active`, you are done. If it says to reload, run `/reload-plugins`.

### Option 2: from your shell

```bash
claude plugin marketplace add YOUR-GITHUB-USERNAME/claude-mods
claude plugin install cost-guard@sandeep-mods
```

Then start a new Claude Code session, or run `/reload-plugins` in one that is open. With Claude Code 2.1.292 or newer you can do both in one command: `claude plugin install cost-guard --marketplace YOUR-GITHUB-USERNAME/claude-mods`.

You can set options while installing, for example rupees at 84 per dollar:

```bash
claude plugin install cost-guard@sandeep-mods --config localCurrencySymbol=₹ --config usdToLocalRate=84
```

### Option 3: for everyone who works in a repository

Run these once in the repository, from your shell, and commit the `.claude/settings.json` they write:

```bash
claude plugin marketplace add YOUR-GITHUB-USERNAME/claude-mods --scope project
claude plugin install cost-guard@sandeep-mods --scope project
```

Committing turns Cost Guard on for the repository but doesn't download it to anyone's machine, so each teammate also runs this once in that repository:

```bash
claude plugin install cost-guard@sandeep-mods --scope project
```

### Option 4: for a whole organization

An administrator on a Team or Enterprise plan can register this marketplace and turn the plugin on for every machine through managed settings (`extraKnownMarketplaces` and `enabledPlugins`). See [Manage plugins for your organization](https://code.claude.com/docs/en/plugins/org) and [Manage mods for your organization](https://code.claude.com/docs/en/plugins/mods/admin).

### Option 5: without a marketplace

Clone this repository, or download it as a zip and unzip it (GitHub's **Download ZIP** names the folder `cost-guard-main`). Then, from the folder that holds it, either try it for one session:

```bash
claude --plugin-dir ./claude-mods/mods/cost-guard
```

or install it from the folder so it loads every time (keep the folder where it is; moving it breaks the install):

```bash
claude plugin marketplace add ./claude-mods
claude plugin install cost-guard@sandeep-mods
```

### Option 6: from Anthropic's community marketplace

Once Cost Guard is listed in [Anthropic's community marketplace](https://github.com/anthropics/claude-plugins-community), you can also install it from there:

```
/plugin marketplace add anthropics/claude-plugins-community
/plugin install cost-guard@claude-community
```

## Install a document converter

Cost Guard runs a converter that is already on your machine; it never downloads one. Without a converter, documents are read as before and Cost Guard says so once per session.

**markitdown (recommended, all formats).** Needs Python 3.10 or newer.

| System | Command |
| --- | --- |
| macOS / Linux | `pip install "markitdown[all]"` (or `pip3 ...`) |
| Windows | `py -m pip install "markitdown[all]"` |

If the `markitdown` command isn't on your PATH, that's fine: Cost Guard also tries `python3 -m markitdown`, `python -m markitdown` and `py -m markitdown`.

**pandoc (Word, OpenDocument, RTF, EPUB).** macOS `brew install pandoc`, Debian or Ubuntu `sudo apt install pandoc`, Windows `winget install --id JohnMacFarlane.Pandoc`.

**pdftotext (PDF only).** macOS `brew install poppler`, Debian or Ubuntu `sudo apt install poppler-utils`.

Check a converter works: `markitdown some-file.pdf` should print text.

## Check that it works

1. Start a Claude Code session and run `/plugin`. The line under the tabs should name it, for example `1 mod active · cost-guard`.
2. Send any message. When the reply finishes, the meter appears above the prompt and the status line shows something like `≈$0.03 this chat · ctx 18k`.
3. Type `/spend` to see the full report.
4. `@`-mention a PDF or Word file. A dim line in the transcript says it was read as markdown, and a `.md` copy appears beside the file.

## Using Cost Guard

### The meter

| Color | When | What to do |
| --- | --- | --- |
| Grey | Normal | Nothing. |
| Yellow | Context over 80k tokens, or the chat over $5 | Finish the current task, then start a fresh session for the next one. |
| Red | Context over 150k tokens | Press **Handoff**, run `/clear`, then ask Claude to `read HANDOFF.md and continue`. |

**Hide** quiets the band until the chat reaches a higher level. The status line keeps showing the figures. When a chat is cleared with `/clear`, the meter starts again from zero; today's total keeps counting.

### Handoff

**Handoff** sends Claude one message asking it to save a handoff note to `HANDOFF.md` in your project (under 250 words: the goal, what is done, key decisions, files involved, next steps). It costs one reply, then everything after `/clear` starts small. `/compact` is the alternative when you must keep the same chat going.

### `/spend`

```
Spend, at API list prices (on a Pro, Max or Team plan this is the API-equivalent value, not your bill)
  This chat     $1.84 over 12 replies
  Last reply    $0.21, priciest $0.42
  Context now   92k tokens of 200k, re-sent with every message
  Today         $6.40 (every session on this machine)
  Last 7 days   $21.10: Thu $3.20, Wed $4.05, Tue $2.90, Mon $1.75, Sun $0.00, Sat $2.80
Read as markdown instead of the original: 2 files
  report.docx → /work/report.docx.md (~6.1k tokens)
  ...
```

*Example output.*

### Documents

- Mention files with `@path` rather than dragging them into the message. Attached documents are sent whole; mentioned ones can be converted.
- A converted copy sits beside the original as `<name>.<ext>.md`. If that folder can't be written, the copy goes to `.claude/cost-guard/` in your project instead. Delete copies any time; they are recreated when needed.
- To give Claude only part of a big text file, mention a line range: `@notes.txt#L1-200`.
- To skip conversion, turn off `convertDocs` in the settings.

## Settings

Change settings in Claude Code with `/plugin` → **Installed** → **cost-guard** → **Configure options**, or from your shell:

```bash
claude plugin configure cost-guard@sandeep-mods                 # list options and which are set
echo '{"warnAtTokens":"60000","longChatAction":"hold-once"}' | claude plugin configure cost-guard@sandeep-mods --values-stdin
```

They are stored in `~/.claude/settings.json`:

```json
{
  "pluginConfigs": {
    "cost-guard@sandeep-mods": {
      "options": {
        "localCurrencySymbol": "₹",
        "usdToLocalRate": 84,
        "warnAtTokens": 60000
      }
    }
  }
}
```

Restart Claude Code after changing them from the shell.

| Option | Default | What it does |
| --- | --- | --- |
| `warnAtTokens` | `80000` | Context size where the meter turns yellow |
| `urgeAtTokens` | `150000` | Context size where it turns red and offers Handoff |
| `warnAtUsd` | `5` | Chat cost (US dollars) where it turns yellow |
| `replyToastUsd` | `1` | A single reply costing at least this much shows a toast; `0` turns it off |
| `largeFileKb` | `150` | An `@`-mentioned file at least this big gets a warning |
| `largePasteTokens` | `15000` | A message with at least this much typed or pasted text gets a warning |
| `inlineMarkdownTokens` | `20000` | Converted copies bigger than this are attached as a 300-line preview |
| `longChatAction` | `warn` | `hold-once` also holds the next message once at the red level and puts your text back in the box |
| `convertDocs` | `true` | Convert documents to markdown before Claude reads them |
| `localCurrencySymbol` | empty | Symbol for the local figure, for example `₹`, `€`, `£` |
| `usdToLocalRate` | `0` | Local currency per US dollar, for example `84`; `0` hides the local figure |

Exchange rates change; update `usdToLocalRate` now and then. Cost Guard never looks rates up online.

## Updating

Install updates with:

```bash
claude plugin update cost-guard@sandeep-mods
```

or turn on automatic updates: run `/plugin`, open **Marketplaces**, select **sandeep-mods** and choose **Enable auto-update**. Run `/reload-plugins` (or start a new session) to load a new version. See the [changelog](CHANGELOG.md) for what changed.

## Turning it off and uninstalling

- **Turn it off:** `/plugin` → **Installed** → **cost-guard** → **Disable plugin**, or `claude plugin disable cost-guard@sandeep-mods`.
- **Uninstall:** `claude plugin uninstall cost-guard@sandeep-mods`. Add `--scope project` if you installed it for a repository.
- **Remove the marketplace too:** `claude plugin marketplace remove sandeep-mods`.
- **One session without any mods:** start Claude Code with `--safe-mode`.

The `.md` copies of your documents stay where they are and are safe to delete.

## Privacy and security

A mod is code that runs inside Claude Code with your permissions, so you should know what this one does. Everything below can be checked: clone the repository and run `claude plugin validate mods/cost-guard`, which lists every event a mod hooks and every call it makes, without running it.

**What it hooks:** session start, end and usage measurements; turn start and end; prompt submission; `@`-mentions; Claude's `Read` tool calls; its own `/spend` command; and the band above the prompt.

**What it reads:**
- The cost and context figures Claude Code already shows in `/cost` and the status line.
- The length of each message you send (to estimate tokens). It doesn't store or send your text, except to put it back in the prompt box when `hold-once` holds a message.
- The size and date of files you `@`-mention, and the documents it converts.

**What it writes:**
- Markdown copies of documents, beside the original or under `.claude/cost-guard/` in your project. It only ever overwrites copies it made itself (they start with a `<!-- cost-guard: markdown copy ... -->` line).
- Daily spending totals in the mod's own store under your Claude Code configuration folder, kept for 90 days.

**What it runs:** only the converters named above (`markitdown`, `python -m markitdown`, `pandoc`, `pdftotext`), on the document being read.

**What it never does:** make network requests, send data anywhere, call a model on its own, or approve tool calls. The **Handoff** button sends one ordinary message to Claude, only when you press it.

## Troubleshooting

**The meter never appears.**
- Check your version: `claude --version` must be 2.1.287 or newer (desktop app: 2.1.286).
- Run `/plugin` and look for `cost-guard` in the `mods active` line and on the **Installed** tab. If it shows under **Errors**, the reason is there.
- The meter appears only after the first reply of a chat.
- It doesn't draw in the VS Code extension, `claude -p` or cloud sessions; see [Where it works](#where-it-works).
- Your organization may only allow managed mods (`allowManagedModsOnly`), or `disableAllHooks` may be set in your settings.
- For detail, start Claude Code with `claude --debug` and look for lines starting with `cost-guard:`.

**"could not turn ... into markdown".** No converter was found. Install one (see above), check it from a terminal, then restart Claude Code. On Windows, make sure Python's `Scripts` folder is on PATH, or rely on `py -m markitdown`.

**A PDF wasn't converted.** Scanned PDFs have no text layer, so Cost Guard leaves them for Claude to read as pages. Password-protected PDFs can't be converted either.

**The figures differ from my bill.** They are API list prices, as `/cost` shows them. On a Pro, Max or Team plan your bill is your plan's price; read the figures as what the same work would cost on the API, and watch the "plan limit" figure for how close you are to your usage limit.

**"Today" looks too high or low.** It adds up every Claude Code session on this machine that has Cost Guard loaded, by your computer's local date. Sessions on other machines, or before Cost Guard was installed, aren't counted.

**The install says options aren't set.** That's fine: defaults apply until you change them.

## FAQ

**Does it work in the claude.ai chat or the Claude app?** No. Mods run only in Claude Code.

**Does Cost Guard itself cost tokens?** Barely. It adds no instructions to Claude's context. The only text it adds is a one-line note when a document was converted, and the `/spend` report when you run it.

**Can a team lead see everyone's spending?** Not from this mod: each person sees their own figures on their own machine. For organization-wide usage, use the usage and analytics pages of your Claude or Console admin settings.

**Why `report.docx.md` and not `report.md`?** So a copy never collides with a markdown file of your own.

**Can I change the 300-line preview?** Raise `inlineMarkdownTokens` to attach bigger documents whole.

## Development

```
cost-guard/
├── .claude-plugin/
│   ├── plugin.json        manifest and settings (userConfig)
│   └── marketplace.json   makes this repository installable
├── hooks/
│   ├── hooks.json         points at the hooks module
│   ├── register.tsx       every hook, the band and /spend
│   ├── figures.ts         settings, formatting and levels
│   └── convert.ts         converter list and file helpers
├── types/index.d.ts       the mod's state, typed
├── tests/cost-guard.test.tsx
└── tsconfig.json          extends the types Claude Code writes
```

Load your working copy for one session, with edits reloading as you save:

```bash
claude --plugin-dir ./claude-mods/mods/cost-guard
```

Check and test before every commit:

```bash
claude plugin validate --strict mods/cost-guard
claude plugin test mods/cost-guard
```

When Claude Code loads the mod from your folder it writes the API's type declarations into `.claude-plugin/types/` (ignored by git), and `tsc -p .` then type-checks the mod against them.

The mods API is described in the [mods documentation](https://code.claude.com/docs/en/plugins/mods/overview). The API is early access and may change between Claude Code releases; if a release breaks something, please open an issue.

### Releasing a new version

1. Make the change, then run validation and the tests.
2. Raise `version` in `.claude-plugin/plugin.json` (users don't receive commits made without a version change) and add an entry to `CHANGELOG.md`.
3. Commit and push. Optionally tag it with `claude plugin tag --push` from the repository.

Never rename the plugin (`cost-guard`) or the marketplace (`sandeep-mods`): existing installs are recorded under those names.

## Contributing

Issues and pull requests are welcome. Please describe what you saw and what you expected, with your Claude Code version and operating system. Pull requests should pass `claude plugin validate --strict` and `claude plugin test`, and add a test for new behaviour.

## License

[MIT](LICENSE) © 2026 Sandeep

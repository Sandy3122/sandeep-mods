# Cost Guard

Cost Guard shows what each chat, reply and day costs, warns you when a chat gets long, and turns documents into markdown before Claude reads them.

Part of [Sandeep Mods](https://github.com/Sandy3122/claude-mods) · Cost and usage

```
Spend · this chat ≈$1.84 · last reply $0.21 · today $6.40 · context 92k of 200k (46%)
This chat is getting long: each message now re-sends about 92k tokens. Your last reply cost $0.21.
When you switch topics, start a fresh session (/clear).
[ Hide ]
```

*The band above the prompt (example figures).*

## What it does

- Shows a band above the prompt with this chat's cost, the last reply, today's total, and how full the context window is. On a subscription it also shows how much of your plan's usage window you have used.
- Puts the chat's cost and context size in the status line.
- Turns the band yellow past 80k tokens or $5, and red past 150k tokens. At red it offers a **Handoff** button that has Claude write a short `HANDOFF.md`, so you can run `/clear` and carry on in a cheap, fresh chat.
- Warns you about heavy input: a long paste, attached documents, three or more images, or a large `@`-mentioned file. Whatever you add is re-sent with every later message.
- Converts PDF, Word, PowerPoint, Excel, OpenDocument, RTF and EPUB files to a markdown copy before Claude reads them.
- Adds `/spend`, a report of this chat, today and the last 7 days.

## Install

```
/plugin marketplace add Sandy3122/claude-mods
/plugin install cost-guard@sandeep-mods
```

## Use

- **The band.** It appears after the first reply of a chat. **Hide** quiets it until the chat reaches a higher level; the status line keeps showing the figures. `/clear` starts the chat's figures again from zero. Today's total keeps counting.
- **Handoff.** The button sends Claude one message asking for `HANDOFF.md` in your project (under 250 words: goal, what is done, decisions, files, next steps). Run `/clear`, then ask Claude to read it.
- **`/spend`.** Prints this chat's cost, the last and priciest reply, the context size, today's total, the last 7 days, and the documents read as markdown. Figures are API list prices, as in `/cost`. On a Pro, Max or Team plan they are the API value of the work, not your bill.
- **Documents.** Mention files with `@path`. A converted copy sits beside the original as `report.docx.md` and Claude reads that instead. A copy over the `inlineMarkdownTokens` limit is attached as a preview of its first 300 lines, with its path. A scanned PDF with no text layer is left alone. If a task needs a PDF's pictures or layout, Claude can read the original again.
- **Hold once.** With `longChatAction` set to `hold-once`, the first message you send at the red level is held and your text is put back in the box. Press Enter to send it anyway.

## Settings

| Option | Default | What it does |
| --- | --- | --- |
| `warnAtTokens` | `80000` | Context size where the band turns yellow |
| `urgeAtTokens` | `150000` | Context size where it turns red and offers Handoff |
| `warnAtUsd` | `5` | Chat cost in US dollars where it turns yellow |
| `replyToastUsd` | `1` | A single reply costing at least this much shows a toast; `0` turns it off |
| `largeFileKb` | `150` | An `@`-mentioned file at least this big gets a warning |
| `largePasteTokens` | `15000` | A message with at least this much typed or pasted text gets a warning |
| `inlineMarkdownTokens` | `20000` | Converted copies larger than this are attached as a preview |
| `longChatAction` | `warn` | `hold-once` also holds the next message once at the red level |
| `convertDocs` | `true` | Convert documents to markdown before Claude reads them |
| `localCurrencySymbol` | empty | Symbol shown beside dollar figures, for example `₹` |
| `usdToLocalRate` | `0` | Local currency per US dollar, for example `84`; `0` hides the local figure |

Change them in `/plugin` → **Installed** → **cost-guard** → **Configure options**, or run `claude plugin configure cost-guard@sandeep-mods`. Cost Guard never looks up exchange rates; update `usdToLocalRate` yourself.

## Requirements

- Claude Code 2.1.287+ (terminal or desktop app Code tab).
- A document converter for the markdown feature, optional: [markitdown](https://github.com/microsoft/markitdown) (`pip install "markitdown[all]"`, or `py -m pip install "markitdown[all]"` on Windows) handles every format. pandoc handles Word, OpenDocument, RTF and EPUB. `pdftotext` from poppler handles PDF. Without a converter, documents are read as before and Cost Guard tells you once per session.
- The band and status line draw in the terminal and the desktop app's Code tab. In the VS Code extension, `claude -p` and cloud sessions, the band and status line don't draw, but conversion, `/spend` and the warnings in the transcript still work.

## What it can access

- **Hooks:** session start, end and measurements; turn start and end; prompt submission; `@`-mentions; Claude's `Read` tool calls; its own `/spend` command; and the band above the prompt.
- **Reads:** the cost and context figures Claude Code already shows in `/cost`; the length of each message you send, to estimate tokens (your text is not stored, and is only put back in the box when `hold-once` holds a message); the size and date of files you `@`-mention.
- **Runs programs:** only the converters `markitdown`, `python -m markitdown`, `pandoc` and `pdftotext`, on the document being read. It never downloads one.
- **Writes files:** markdown copies of documents, beside the original or under `.claude/cost-guard/` in your project. It only overwrites copies it made itself. It also keeps daily spending totals in the mod's own store for 90 days.
- **Network and models:** it makes no network requests and calls no model. The **Handoff** button sends one ordinary message to Claude, only when you press it. It never approves tool calls. The only tool call it changes is a `Read` of a convertible document, which it points at the markdown copy.

## Troubleshooting

- **The band never appears.** Check `claude --version` is 2.1.287 or newer. Run `/plugin` and look for `cost-guard` in the active mods line; if it is under **Errors**, the reason is there. The band appears only after the first reply, and not in the VS Code extension. Your organization may allow only managed mods, or `disableAllHooks` may be set.
- **"Could not turn … into markdown".** No converter was found. Install one (see Requirements), check it from a terminal, then restart Claude Code.
- **A PDF wasn't converted.** Scanned and password-protected PDFs can't be converted.
- **The figures differ from my bill.** They are API list prices. On a subscription, watch the plan usage figure for how close you are to your limit.
- **"Today" looks wrong.** It adds up every Claude Code session on this machine that has Cost Guard loaded, by your computer's local date.

## License

MIT; see LICENSE.

## Credits

Created and maintained by Sandeep as part of Sandeep Mods.

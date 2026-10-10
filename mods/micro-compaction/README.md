# Micro Compaction

Micro Compaction adds `/compact micro`, which shrinks your conversation by replacing file reads with short placeholders and dropping thinking, with no model call.

Part of [Sandeep Mods](https://github.com/Sandy3122/sandeep-mods) · Context

## What it does

- Replaces each successful `Read` result with a one-line placeholder, such as `[file contents elided by compaction: <path>, N lines. Read it again if needed.]`.
- Does the same for images and PDFs, which are usually the largest results in a conversation.
- Removes thinking-only messages from the transcript.
- Keeps everything else as it was: your prompts, Claude's replies, tool calls and the output of other tools.
- Runs on your machine and calls no model, so it costs no tokens.

## Install

```
/plugin marketplace add Sandy3122/sandeep-mods
/plugin install micro-compaction@sandeep-mods
```

## Use

Type `/compact micro` in a session. Claude can read an elided file again on its own when it needs the contents.

- The mod acts only on a manual `/compact` whose instructions are exactly `micro` (any case, spaces around it ignored).
- Plain `/compact`, and `/compact` with other instructions, work as usual and write a normal summary.
- Automatic compaction also writes a normal summary.
- Running `/compact micro` twice is safe. Existing placeholders are left alone.

Some results are not elided: reads that failed, text shorter than its placeholder (tiny files and "unchanged since last read" notes), and earlier placeholders. Bash output is not touched, even when you used `cat`.

Tips:
- Run it after a reading phase, once the findings are already in the conversation.
- Micro compaction rewrites earlier messages, so the prompt cache is lost. It pays off most when the cache has gone cold or the elided content is large.
- Claude re-reads a file it still needs, which adds the tokens back.
- It cannot remove unrelated discussion. For that, use plain `/compact` or `/clear`.
- A lower `bashOutputMaxChars` in your Claude Code config sends more long Bash output to files, which Claude then reads with `Read`, so more of it can be elided.

## Settings

None.

## Requirements

- Claude Code 2.1.287+ (terminal or desktop app Code tab).
- `/compact` must be available, so it does not work in `claude -p`.

## What it can access

- **Hooks:** the `session.compact` event, for manual compactions only. Other triggers never reach it.
- **Gating:** for `/compact micro` it replaces the compaction and returns the rewritten message list. For any other `/compact` it passes the call on unchanged.
- **Reads:** the conversation messages Claude Code hands to the hook, held in memory.
- **Writes:** one log line through `$.ui.log` with the number of elided reads and characters. No files.
- **Programs, network and models:** none. It runs no commands, makes no network requests and calls no model.

## Troubleshooting

- **Plain `/compact` still writes a summary.** That is intended. Only `/compact micro` uses this mod.
- **Nothing seems smaller.** Only successful `Read` results are elided. If the context is mostly Bash output, MCP tool output, web results or discussion, there is little to remove.
- **Claude reads the same file again.** It saw the placeholder and needed the contents. This is expected.
- **`/compact micro` does nothing in `claude -p`.** `/compact` is not available there. Use an interactive session.

## License

Unlicense (public domain); see LICENSE.

## Credits

Adapted and maintained by Sandeep as part of Sandeep Mods. Originally created by [ruihe774](https://github.com/ruihe774) in [ruihe774/cc-micro-compaction](https://github.com/ruihe774/cc-micro-compaction/tree/7409c6265aa977c01cfd6b070af3c734f56fb467), Unlicense.

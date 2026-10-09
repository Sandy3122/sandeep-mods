# Micro Compaction: architecture

## Overview

Micro Compaction hooks `session.compact` for manual compactions. When the instructions are exactly `micro`, it rewrites the message list with a pure function and returns it, which replaces core's model-written summary. Any other call goes to `next(e)` unchanged.

```
session.compact (manual) ─▶ instructions == "micro"? ─no─▶ next(e)
                                  │ yes
                                  ▼
                       microCompact(e.messages) ─▶ { messages } ─▶ transcript
                                  └─▶ $.ui.log (counts)
```

## Files

| File | Role |
| --- | --- |
| `hooks/hooks.json` | Points at `./register.ts` |
| `hooks/register.ts` | The `session.compact` hook and its gate on `micro` |
| `hooks/elide.ts` | `microCompact(messages)`, a pure function that elides Read results and drops thinking |
| `tests/elide.test.ts` | Unit tests for `microCompact` |
| `docs/` | Reference docs downloaded from the upstream repository (`mods-*.md`) |

## Events hooked

| Event (matcher) | What the hook does | Gating? |
| --- | --- | --- |
| `session.compact` (`trigger: manual`) | If instructions trimmed and lower-cased equal `micro`, returns `{ messages }` from `microCompact`; otherwise calls `next(e)` | Yes (replaces the compaction) |

## Calls on $

| Call | Why |
| --- | --- |
| `$.ui.log` | One debug log line with the elided read count and character count |

## State

- `$.state`: none.
- `$.store`: none.
- Files: none.

## Drawing

None. The mod draws nothing.

## Settings flow

None. The mod has no `userConfig` options.

## Testing

`tests/elide.test.ts` covers the elision rules, thinking removal and idempotence. Run `claude plugin test mods/micro-compaction`. Typecheck with `npx -p typescript tsc -p .` (TS5097 on `.ts` imports is expected). An end-to-end check needs an interactive session: read a file, run `/compact micro`, then inspect the session JSONL after the last `compact_boundary`. Unset the `CLAUDE*` and `AI_AGENT` variables first (except `CLAUDE_CODE_PLUGIN_DIRS`) so it is not treated as a child session.

## Known limits

- Only the `Read` tool is elided, chosen by its record's `result.type`. `image`, `pdf` and `parts` (PDF pages) are always elided. `text`, `notebook`, `file_unchanged` and records without a type are elided only when the text is longer than the placeholder. Errored reads and earlier placeholders (any `[... elided by compaction: `) are kept.
- Bash output is not touched: long output is spilled to a file, which is then read with `Read`.
- Returning `{ messages }` without calling `next` replaces core compaction. The engine writes a `compact_boundary` and the list becomes the transcript.
- `e.messages` has one message per content block. A thinking-only message reads as role `assistant`, empty text, no tool uses; dropping those strips thinking.
- A message returned with its `handle` is kept whole. One without is rebuilt from role, text and tool blocks; a rebuilt thinking-only message becomes `(no content)`, so those are dropped, not rebuilt. A rebuilt tool result carries only the placeholder text, with no image or document block.
- After a hook compaction, core resets its read-state cache, so an identical Read returns full content instead of the "unchanged" stub.
- `session.compact` is barely documented. If docs and types disagree, trust `SessionCompactInput`, `SessionCompacted` and `SessionMessage` in `.claude-plugin/types/claude-code/index.d.ts`, which is generated per version and not hand-edited.
- Never rename the plugin (`micro-compaction`) or the marketplace (`sandeep-mods`); existing installs use those names.

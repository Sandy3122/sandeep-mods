# Prismantis: architecture

## Overview

Prismantis replaces Claude Code's drawing of replies, prompts, tool rows and command output. Markdown text is parsed into blocks, the blocks are drawn as `Box` and `Text` trees in a theme, and Hebrew and Arabic lines are reordered for the terminal. It keeps no state and runs no programs.

```
ui.render (AssistantMessage, CommandOutput, UserMessage, ToolUse, ToolGroup, TurnDuration)
   text ─▶ markdown.ts parse ─▶ blocks ─▶ render.tsx (theme.ts, rtl.ts, mermaid.tsx, vendor/) ─▶ Box/Text tree
command.run prismantis ─▶ help / demo / copy / theme
prompt.submit ─▶ adds the diagram hint to e.context
```

## Files

| File | Role |
| --- | --- |
| `hooks/hooks.json` | Points at `./register.tsx` |
| `hooks/register.tsx` | Every hook and every call on `$`, including the terminal detection and copy buttons |
| `hooks/markdown.ts` | Markdown to blocks and inline nodes (pure) |
| `hooks/render.tsx` | Blocks to `Box`/`Text` trees: tables, lists, code, tool rows, prompts (pure) |
| `hooks/theme.ts` | Option merging, color validation, style resolution (pure) |
| `hooks/presets.ts` | The 15 color palettes plus `mono` |
| `hooks/mermaid.tsx` | Mermaid text art, boxes and the bar and line chart handling (pure) |
| `hooks/rtl.ts` | Hebrew and Arabic: simplified bidi over styled runs, wrapping, per-terminal shaping (pure) |
| `hooks/help.ts` | Text of `/prismantis`, `demo` and `demo-rtl` |
| `hooks/vendor/` | Bundled beautiful-mermaid (`mermaid-text.js`) and Prism (`prism.js`) with their `.d.ts` files; generated, not edited by hand |
| `types/index.d.ts` | Contract for `$.prismantis`, which other mods type against |
| `tests/` | `render`, `features`, `regressions`, `rtl` and `contrast` suites, plus `tests/snapshots` used by `scripts/snapshot.mjs` |
| `scripts/` | Maintainer tooling, not used at run time or by the tests: `build-vendor.mjs` (rebuilds `hooks/vendor`), `bench.mjs`, `snapshot.mjs`, `load.mjs`, `package.json` and its lockfile |
| `docs/` | Upstream changelog, `THIRD_PARTY_NOTICES.md`, `demo.md` (the sample reply), `bench-baseline.json`, screenshots and brand images used by the README |
| `tsconfig.json` | Own config; its `include` also covers `.claude-plugin/types`, `hooks`, `types` and `tests` |

## Events hooked

| Event (matcher) | What the hook does | Gating? |
| --- | --- | --- |
| `engine.create` | Registers a stub `prismantis.markdown` noun (also when disabled) | No |
| `session.start` | Detects the terminal for right-to-left text and registers `/prismantis` | No |
| `command.run` (`prismantis`) | Help, demo, copy, and theme switching | Answers the command |
| `prompt.submit` | Re-detects the terminal; appends the diagram hint to the context of composer prompts | Rewrites (adds context) |
| `ui.render` (`AssistantMessage`) | Draws a reply as themed blocks with copy buttons | Replaces drawing |
| `ui.render` (`CommandOutput`) | Draws non-error command output the same way | Replaces drawing |
| `ui.render` (`UserMessage`) | Draws your own prompts as a bubble, bar or chevron | Replaces drawing |
| `ui.render` (`ToolUse`, `ToolGroup`) | Draws compact tool rows when `toolRows` is on | Replaces drawing |
| `ui.render` (`TurnDuration`) | Colors the duration in the turn footer | Replaces drawing |
| `prismantis.markdown` | Answers other mods with a drawn tree, without copy buttons | Answers the call |

Nothing here approves or refuses tool calls. When `enabled` is false only the stub noun is registered.

## Calls on $

| Call | Why |
| --- | --- |
| `$.env.get` | Reads terminal variables to pick the right-to-left shaping |
| `$.ui.resolve` | Gets `Box`, `Text`, `Button` for the surface being drawn |
| `$.ui.copy`, `$.ui.toast` | Copy buttons and `/prismantis copy`, and the result toast |
| `$.command.register` | Registers `/prismantis` |
| `$.session.messages` | Finds the last assistant reply for `/prismantis copy` |
| `$.config.set` | `/prismantis theme` writes `<plugin>.theme` |

## State

- `$.state`: none.
- `$.store`: none.
- Files: none. Parsed markdown is cached in memory per process; the set of expanded tool-call ids lives in a module-level set.

## Drawing

It replaces the built-in drawing of `AssistantMessage`, `CommandOutput`, `UserMessage`, `ToolUse`, `ToolGroup` and `TurnDuration`. Terminal and desktop surfaces both draw the first five; `TurnDuration` is drawn by the terminal only. In Apple Terminal fullscreen it switches to the `inverse` shaping. The transcript is the only site; there is no pane, band or status line.

## Settings flow

The `options` object reaches `register`. `enabled` and `toolRows` are read directly; the rest go through `resolveStyle` in `hooks/theme.ts`, which validates colors and choices and falls back to the theme or default on bad input. The style is built once at registration, so changes need `/reload`; `/prismantis theme` writes the setting through `$.config.set`.

## Testing

The five suites in `tests/` check the drawn tree for markdown, themes, tables, code, mermaid, tool rows, prompts, help text, contrast and right-to-left reordering. Run `claude plugin test mods/prismantis`. `scripts/snapshot.mjs` and `scripts/bench.mjs` (run from `scripts/` after `npm install`) compare renders and timings against `tests/snapshots` and `docs/bench-baseline.json`.

## Known limits

- `$` cannot cross an import: any function that takes `$` must be declared in `hooks/register.tsx`. `claude plugin validate` does not catch this; `claude plugin test` does.
- A render hook may not write `$.state`; schedule writes with `$.clock.after(0, ...)`.
- Claude Code refuses trees over 20000 nodes and draws its own text, so very long code blocks or tables fall back.
- Installed plugins cannot change the system prompt, so the diagram hint rides on the prompt through `prompt.submit`.
- `hooks/vendor` is generated by `scripts/build-vendor.mjs` from pinned beautiful-mermaid and Prism; it carries two build-time patches to beautiful-mermaid. Don't edit it by hand.
- `Image` draws only in terminals with the kitty graphics protocol; there is no font size on any surface.
- The parser is not full CommonMark: nested quotes and HTML draw as plain text.
- `docs/CHANGELOG.md` is the upstream changelog; the root `CHANGELOG.md` carries the same entries.
- Never rename the plugin (`prismantis`) or the marketplace (`sandeep-mods`).

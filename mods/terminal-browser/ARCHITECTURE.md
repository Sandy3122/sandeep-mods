# Terminal Browser: architecture

## Overview

Terminal Browser does not render pages itself. It starts the external `terminal-browser` program as a local bridge, talks to it over HTTP on `127.0.0.1`, and shows the frames it reports as an image in a Pane. A small client module runs inside the pane to capture mouse and key input.

```
/browser, browser.open, open tool ─▶ openBrowser ─▶ terminal-browser claude-bridge launch (port, token)
bridge /state long-poll (watchBridge) ─▶ state.frame ─▶ $.ui.blit + Pane Image
surface.tsx (mouse, keys, size) ─▶ ui.message ─▶ POST /input, /size, /open
bridge /inbox/take ─▶ $.prompt.fill (text and screenshot paths)
```

## Files

| File | Role |
| --- | --- |
| `hooks/hooks.json` | Points at `./register.tsx` |
| `hooks/register.tsx` | Module state, bridge start and watching, command, tools, pane, message and scroll handling |
| `hooks/surface.tsx` | Client component inside the pane: queues pointer and key events, posts them every 20 ms, reports size |
| `hooks/bridge-protocol.ts` | Type guards for bridge replies and pane messages (no libraries, because the module runs in a sandbox) |
| `hooks/urls.ts` | `normalizeUrl`: adds `https://` or `http://` to bare addresses |
| `hooks/browser.d.ts` | The `types` entry: declares the `browser` API on `$` for other plugins |
| `tsconfig.json` | Its own compiler options; includes `.claude/types` and `hooks` |

## Events hooked

| Event (matcher) | What the hook does | Gating? |
| --- | --- | --- |
| `engine.create` | Adds a placeholder `browser` object to the engine | No |
| `browser.open` | Opens the pane and returns `{ ok, url }` or `{ ok: false, error }` | Yes (answers the call) |
| `browser.close` | Closes the pane, returns whether it was open | Yes (answers the call) |
| `session.start` | On the terminal surface, registers `/browser` and, if `agentTool` is on, the `open` and `close` tools | No |
| `command.run` (`browser`) | Closes the pane for `close` or an empty argument while open; otherwise opens it | Yes (answers the command) |
| `tool.call` (`mcp__terminal-browser__open`) | Opens the pane; denies the call if the bridge fails to start | Yes |
| `tool.call` (`mcp__terminal-browser__close`) | Closes the pane and returns a text result | Yes (answers the call) |
| `ui.render` (`Pane`, request id `browser`) | Draws the image and the input client on the terminal; an empty box elsewhere | No |
| `ui.message` | Handles `size` and `input` messages from the client for the browser pane | No (passes through) |
| `ui.scroll` (request id `browser`) | Turns wheel scrolling into scroll events, at most 10 ticks | Yes (returns `{}`) |
| `ui.close` (id `browser`) | Resets state and tells the bridge the browser closed | No (passes through) |

## Calls on $

| Call | Why |
| --- | --- |
| `$.process.run` | `terminal-browser capabilities` (10 s); `terminal-browser claude-bridge launch` (20 s) |
| `$.fs.exists` | Looks for a checkout build at `<plugin root>/../cli/dist/main.js` |
| `$.http.fetch` | Bridge calls on `127.0.0.1`: `GET /state`, `POST /open`, `/size`, `/input`, `/inbox/take`, `/browser/close` |
| `$.prompt.fill` | Puts agent text from the inbox into the prompt box |
| `$.session.surfaces` | Registers the command and tools only on the terminal surface |
| `$.command.register`, `$.tool.register` | `/browser`; `open` and `close` tools |
| `$.ui.open`, `.close`, `.invalidate`, `.resolve`, `.blit`, `.log` | The pane, redraws, components, image frames, diagnostics |
| `$.clock.sleep` | 250 ms retry when the bridge does not answer |
| `$.plugin.root` | Locates a checkout build |

## State

- `$.state`: none. Module-level `state` in `register.tsx` holds `port`, `token`, `open`, `pendingUrl`, `region`, `last`, `frame`, `mounted`, `watcher` and `viewGeneration`. It resets on restart.
- `$.store`: none.
- Files on disk: none written by the mod. The bridge program passes frames through shared memory.

## Drawing

One `Pane` with the request id `browser`. On the terminal surface it draws an `Image` of the latest frame (capped at 255 by 255 cells) with a `Client` over it that loads `surface.tsx`. The client's `viewGeneration` key is bumped after the prompt is filled so input focus returns to the prompt. On other surfaces it draws an empty box.

## Settings flow

`agentTool` (boolean, default false) arrives as `options.agentTool` in `register`. When true, `session.start` registers the open and close tools. Nothing else reads settings.

## Testing

There are no tests. Run `claude plugin validate mods/terminal-browser` to check the manifest and hooks.

## Known limits

- Needs the external `terminal-browser` program and a terminal with kitty graphics and unicode placeholders. Multiplexers often break it.
- Mouse positions can be slightly off, because Claude Code does not report pixel coordinates.
- The pane cannot always be resized to the size you want.
- Depends on the function hooks API, which may change between Claude Code releases.
- The `types` file declares `browser.open({ url? })` returning `{ ok: true, url } | { ok: false, error }`, and `browser.close()` returning a boolean. Do not change it: other plugins use it.
- `claude plugin validate` notes several gating hooks without `.catch`.
- Never rename the plugin (`terminal-browser`) or the marketplace (`sandeep-mods`).

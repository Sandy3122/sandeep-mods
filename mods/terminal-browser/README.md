# Terminal Browser

Terminal Browser opens a real web browser in a pane inside Claude Code, so you can preview pages without leaving the terminal.

Part of [Sandeep Mods](https://github.com/Sandy3122/sandeep-mods) · Viewing output

## What it does

- Opens a pane to the right of the chat that shows a live browser page as an image.
- Passes your mouse clicks, scrolling and keystrokes to the page while the pane has focus.
- Titles the pane with the page title.
- Can hand text the page sends back (such as a screenshot path) to your prompt box.
- Adds a `browser` API that other plugins can call to open or close the pane.
- Can add an open and close tool that Claude calls itself (off by default).

## Install

```
/plugin marketplace add Sandy3122/sandeep-mods
/plugin install terminal-browser@sandeep-mods
```

## Use

| Command | What it does |
| --- | --- |
| `/browser` | Opens the pane. If it is already open, closes it. |
| `/browser <url>` | Opens the pane on that page. A bare host such as `example.com` gets `https://`. `localhost` and IP addresses get `http://`. |
| `/browser close` | Closes the pane. |

- **First page.** With no address, the pane shows the browser's start page, or the page it last showed.
- **Size.** The picture is capped at 255 by 255 terminal cells.
- **Scrolling.** The mouse wheel scrolls the page, up to 10 steps at a time.
- **Other plugins.** A plugin can call `$.browser.open({ url })` and `$.browser.close()`. ARCHITECTURE.md lists the types.
- **Agent tool.** With the `agentTool` setting on, Claude gets `mcp__terminal-browser__open` and `mcp__terminal-browser__close`. Claude drives the page itself with the `terminal-browser` command line program.

The command and tools are only registered in the terminal. Other surfaces get an empty pane.

## Settings

| Option | Default | What it does |
| --- | --- | --- |
| `agentTool` | Off | Adds the open and close tools so Claude can show a page in the pane. |

## Requirements

- Claude Code 2.1.287+ (terminal only).
- The `terminal-browser` program, installed from [terminal-browser.sh](https://terminal-browser.sh). It must be recent enough to report the `embedding` and `image-frames` capabilities. If not, the mod tells you to run `terminal-browser upgrade`.
- A terminal that supports the kitty graphics protocol with unicode placeholders, such as Ghostty or kitty. Other terminals can show garbled output.
- Terminal multiplexers such as tmux often break the pictures.
- Function hooks must be enabled: set `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS` to `1` in the `env` block of `~/.claude/settings.json`.

## What it can access

- **Hooks:** session start, the `/browser` command, the open and close tools (when enabled), drawing the pane, messages and scrolling from the pane, and closing the pane. It also adds the `browser` API to the engine.
- **Runs programs:** the `terminal-browser` program on your machine, with `capabilities` (a 10 second check) and `claude-bridge launch` (20 seconds), which starts a background browser. If a `cli/dist/main.js` sits next to the mod folder, it runs that with `node` instead. It checks for that file with a file-exists test.
- **Network:** requests only to `http://127.0.0.1` on the port the launched program reports, with a bearer token it reports. They send your mouse and key events, the pane size, the URL to open, and requests for page state and for text waiting for you. Nothing is sent to other hosts by the mod. The browser itself loads whatever page you open, so that page's site sees a normal visit. Your OS may ask whether your terminal may reach the local network.
- **Controls a browser:** the `/browser` command lets you open any URL. With `agentTool` on, Claude can open any URL in a real browser and, through the `terminal-browser` program, can control the page. That includes clicking, typing and signing in to sites if the browser has a session. Turn the setting on only if you want that.
- **Fills your prompt:** text the browser queues (lines of text and screenshot paths) is put in your prompt box with a new line. It does not submit it.
- **Model calls:** none by the mod. Anything Claude does with the tools costs tokens as usual.
- **Writes files:** none in your project, and it keeps nothing between sessions. The browser program shares page images through shared memory.
- It never approves tool calls. When the tools are on, it answers calls to its own open and close tools, and can refuse the open call if the browser fails to start.

## Troubleshooting

- **"Please install terminal-browser first".** The `terminal-browser` program was not found. Install it from terminal-browser.sh.
- **"Newer terminal-browser version required".** Run `terminal-browser upgrade`.
- **The pane is blank or the screen is garbled.** Your terminal may not support kitty unicode placeholders, or a multiplexer is in the way. Use Ghostty or kitty without tmux.
- **Nothing happens with `/browser`.** The command is only registered in a terminal session, and function hooks must be enabled.
- **Clicks land slightly off.** Claude Code does not report pixel mouse positions, so this is expected.

## License

MIT; see LICENSE.

## Credits

Adapted and maintained by Sandeep as part of Sandeep Mods. Originally created by [zenbu-labs](https://github.com/zenbu-labs) in [zenbu-labs/terminal-browser](https://github.com/zenbu-labs/terminal-browser/tree/2165ae76c9639e3996829ab0e6d54ddbd4f06ad8/claude-code-plugin), MIT.

# Aside

Aside opens a read-only side chat beside the transcript, so you can ask questions about the session so far without touching the main thread.

Part of [Sandeep Mods](https://github.com/Sandy3122/claude-mods) · Context

## What it does

- Adds `/aside`, which opens a pane beside the transcript (or above the prompt in a narrow terminal).
- Answers each question with a fork of the session's own transcript. The fork has no tools.
- Keeps the side chat out of the main thread: Claude in the main session never sees your questions or the answers.
- Answers while a turn is running, using the transcript as of the last finished turn.
- Before the first turn finishes, answers from a plain completion over the transcript text instead.
- Shows under each answer where it came from and how long it took.

## Install

```
/plugin marketplace add Sandy3122/claude-mods
/plugin install aside@sandeep-mods
```

## Use

| Input | What it does |
| --- | --- |
| `/aside` | Opens the pane |
| `/aside what has changed so far?` | Opens the pane and asks |
| **Tab** | Puts the cursor in the pane's input |
| **Enter** | Asks the question |
| **Esc** | Gives the keys back to the prompt |
| **ctrl+x tab** | Focuses the pane again |
| **Clear** button | Empties the side chat |
| **Close** button | Closes the pane |

Each answer has a footer line:

- `fork · 1244 ms · read 72848 · new 242 · out 100`: a fork over the transcript. `read` is the cached prefix, `new` is what was added, `out` is the reply.
- `live · 800 ms · 5120 chars of transcript sent uncached`: asked before the first turn finished, so there was no snapshot to fork.

Answers are cut at 1,200 characters. The pane shows the most recent questions, up to `maxHistory`.

## Settings

| Option | Default | What it does |
| --- | --- | --- |
| `liveFallback` | `true` | Before the first turn completes, answer at once from the transcript text. Off: the question waits and a fork answers it when the turn ends |
| `liveModel` | `haiku` | Model for these live answers; forks always use the session's model |
| `maxHistory` | `8` | How many earlier side exchanges ride along in each question (1 to 50), and how many the pane shows |

Change them in `/plugin` → **Installed** → **aside** → **Configure options**, or run `claude plugin configure aside@sandeep-mods`.

## Requirements

- Claude Code 2.1.287+ (terminal or desktop app Code tab).
- A terminal at least 110 columns wide for the pane to dock beside the transcript.

## What it can access

- **Hooks:** session start (registers `/aside`), the `/aside` command, the end of each turn, and the pane's drawing, input and button presses.
- **Reads:** the session transcript, through `$.session.messages`, only when a live answer is needed.
- **Calls a model, which costs tokens, on every question.** Each question runs `$.model.fork` over the whole session transcript. A fork reads the cached prefix of your session (billed at the cache-read rate) plus a few new tokens, using the session's model. No tools are available to it, and it is kept off the transcript.
- **Live answers:** when there is no snapshot to fork yet and `liveFallback` is on, the question is answered by `$.model.complete` on `liveModel`. It sends up to the last 60,000 characters of the transcript as fresh, uncached input, with no tools and a 400-token reply limit.
- **Files and programs:** it writes no files and runs no programs.
- **Network:** it makes no network requests of its own. The only outbound traffic is the model calls above.
- It never approves tool calls and never writes to the main thread: `/aside` answers an empty result.

## Troubleshooting

- **`/aside` does not exist.** Run `claude --version` and check it is 2.1.287 or newer. Run `/plugin` and look for `aside` under **Errors**. On older builds, function hooks may need `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`. Your organization may allow only managed mods, or `disableAllHooks` may be set.
- **The pane opens inline instead of beside the transcript.** The terminal is narrower than 110 columns. Widen it.
- **I typed and nothing happened.** Press **Tab** to put the cursor in the pane's input first.
- **The answer says "waiting for this turn to end".** `liveFallback` is off and no turn has finished yet. Turn it on, or wait for the reply.
- **The answer is a reply to an older state.** A fork sees the last finished turn, not the one in progress.

## License

MIT; see LICENSE.

## Credits

Adapted and maintained by Sandeep as part of Sandeep Mods. Originally created by [JayDoubleu](https://github.com/JayDoubleu) in [JayDoubleu/aside](https://github.com/JayDoubleu/aside/tree/cf2b7562ae7b376cdcf9e2436a926aba77dc759f), MIT.

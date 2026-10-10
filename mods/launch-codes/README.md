# Launch Codes

Launch Codes stops dangerous Bash commands until you type a one-time code and confirm a second time.

Part of [Sandeep Mods](https://github.com/Sandy3122/sandeep-mods) · Safety

## What it does

- Checks every Bash command Claude is about to run and lets safe ones through untouched.
- Flags `rm -rf` on anything outside common build folders (`node_modules`, `dist`, `.next`, `coverage`, `/tmp` and similar), `git push --force`, `git reset --hard`, and `DROP` or `TRUNCATE` sent through a SQL client such as `psql` or `mysql`.
- Also flags `supabase db reset`, `vercel --prod`, `chmod -R 777`, and a downloaded script piped into a shell (`curl ... | sh`).
- For a flagged command, opens a pane titled RED ALERT with a 4-character code and plays a looping siren sound. You type the code, then choose LAUNCH to let the command run.
- If you pick ABORT, enter the wrong code, or let the 30-second code expire, the command is blocked and Claude is told not to retry or work around it.
- Adds `/launch-codes`, which runs a demo or tests a command without running it.

## Install

```
/plugin marketplace add Sandy3122/sandeep-mods
/plugin install launch-codes@sandeep-mods
```

## Use

- **A flagged command.** The RED ALERT pane shows the command, why it was flagged, the code and a countdown. A dialog asks for the code: choose **Other** and type it (case and spaces don't matter). Then a second dialog asks you to choose **LAUNCH** or **ABORT**. The pane closes a moment after you answer.
- **`/launch-codes`.** Runs the same steps on a made-up command. Nothing is executed.
- **`/launch-codes test <command>`.** Prints whether the command would need launch codes and why. Nothing is executed.

## Settings

None.

## Requirements

- Claude Code 2.1.287+ (terminal or desktop app Code tab).
- A way to play sound for the siren. If audio is not available the siren is skipped and the rest still works.

## What it can access

- **Hooks:** session start (to add `/launch-codes`), every Bash tool call (this hook can block the command), its own `/launch-codes` command, and the RED ALERT pane.
- **Reads:** the text of each Bash command, to classify it. The text is shown in the pane and in the dialog, and is not stored beyond the open alert.
- **Network and models:** none. It makes no network requests and calls no model.
- **Runs programs:** none.
- **Writes files:** none. The current alert is kept in the session's state only.
- **Sound and screen:** it plays a siren and a launch sound through Claude Code's audio call, and draws the pane, including an animated striped border in the terminal.
- **Approvals:** it never approves anything on its own. A flagged command runs only after you enter the code and choose LAUNCH. If the check itself fails, a flagged command is denied.

## Troubleshooting

- **A command I expected to be flagged ran.** Only the patterns listed above are checked. Commands hidden inside scripts, `eval` or other tools are not inspected.
- **A harmless command was flagged.** `rm -rf` on a path outside the common build folders counts as risky. Choose ABORT and ask Claude for a narrower command, or enter the code if you mean it.
- **The code ran out.** The code lasts 30 seconds. The command is blocked and Claude is told why; ask Claude to try again.
- **No pane or sound.** Check `claude --version` is 2.1.287 or newer, and run `/plugin` to see whether `launch-codes` is under **Errors**.

## License

MIT; see LICENSE.

## Credits

Adapted and maintained by Sandeep as part of Sandeep Mods. Originally created by [OneWave-AI](https://github.com/OneWave-AI) in [OneWave-AI/claude-code-mods](https://github.com/OneWave-AI/claude-code-mods/tree/e6da26ca36a88eec3be25605d30fa20f2c1c0cec/launch-codes), MIT.

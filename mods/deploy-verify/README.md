# Deploy Verify

Deploy Verify checks that a deploy is really live after a deploy command succeeds, and gives Claude the result so it cannot call the deploy done without evidence.

Part of [Sandeep Mods](https://github.com/Sandy3122/sandeep-mods) · Git and deploys

## What it does

- Recognises deploy commands that Claude runs in Bash: `git push`, `wrangler deploy`, `vercel --prod`, `netlify deploy --prod`, `railway up`, `fly deploy`, `npm run deploy`, `gcloud run deploy`, `make deploy`, `gh workflow run`, `gh pr merge` and `gh run rerun`. It ignores dry runs and commands that only quote these words.
- Fetches your live URL with cache-busting headers and a changing query string. It passes when the page returns HTTP 200 and contains the string you chose.
- Adds the result to the tool result as text Claude must read. It tells Claude to say "not verified" when the check fails.
- Keeps checking in the background after a failed check, for 3 minutes, and shows a toast when the site goes live or the check gives up. If the check never passes, it sends Claude a follow-up message so you hear about it.
- When the repo has GitHub Actions workflows, waits for the run that your push started, then checks the live URL. A failed run is reported as not verified. `gh pr create` is watched the same way, but no live check follows.
- Keeps the latest verdict in Claude's context for the rest of the session, so older "it's deployed" claims can't override it.

## Install

```
/plugin marketplace add Sandy3122/sandeep-mods
/plugin install deploy-verify@sandeep-mods
```

## Use

Tell the mod what to check. Create `.claude/deploy-verify.json` in your repo with one of these:

```json
{ "url": "https://example.com", "match": "v1.2.3" }
{ "url": "https://example.com", "matchFile": "VERSION" }
{ "targets": [ { "url": "https://example.com", "match": "v1.2.3" } ] }
```

- `match` is a string that must appear in the page. `matchFile` reads that string from the first line of a file in your repo (a path starting with `/` is used as given). With neither, HTTP 200 is enough.
- Without this file, Claude is told that nothing about the live site was checked, and it must not say the deploy is live.

Then deploy as usual. The check runs by itself after each deploy command that exits 0.

The `/deploy-verify` command:

- `/deploy-verify` checks the live URL now and keeps watching if it fails.
- `/deploy-verify status` lists the targets and what each one expects.
- `/deploy-verify stop` ends a running watch.

To turn the mod off for a session, start Claude Code with `CLAUDE_MODS_DISABLE=all` or `CLAUDE_MODS_DISABLE=deploy-verify`.

## Settings

None. Targets come from `.claude/deploy-verify.json` in each repo.

## Requirements

- Claude Code 2.1.287+ (terminal or desktop app Code tab).
- `curl` on your PATH.
- `git`, to find the branch you pushed.
- Optional: the [GitHub CLI](https://cli.github.com) (`gh`), logged in, to watch GitHub Actions runs.

## What it can access

- **Hooks:** session start (registers `/deploy-verify`), the `/deploy-verify` command, Claude's Bash tool calls, prompt context, and the end of each turn. It does not block or rewrite your commands; it adds context after they run.
- **Network:** `curl` requests to the URLs in `.claude/deploy-verify.json`, and `gh run list`, which talks to GitHub.
- **Programs run:** `curl`, `gh run list` and `git rev-parse --abbrev-ref HEAD`.
- **Files:** reads `.claude/deploy-verify.json`, the file named by `matchFile`, and checks whether `.github/workflows` exists. It writes no files.
- **Environment:** reads `CLAUDE_MODS_DISABLE`.
- **Model calls:** none of its own. The verdict is added to Claude's context, which adds a few lines to the tokens Claude reads. If a watch ends unverified, it sends one follow-up message on your behalf, which starts a model turn and costs tokens.
- **Screen:** a status message while it checks, toasts, and log lines.

## Troubleshooting

- **Claude says nothing was checked.** There is no `.claude/deploy-verify.json` in the repo root. Add one, or run `/deploy-verify` to see the expected format.
- **The check fails right after a deploy.** A CDN can serve the old page for a while. The mod retries and shows a toast when the page changes. Run `/deploy-verify stop` to end the watch.
- **CI is never found.** Run `gh auth status`. If `gh run list` fails, the mod logs it and, after 3 minutes without a run, checks the live URL directly.
- **A deploy command isn't recognised.** Only the commands listed above are matched. A deploy inside quotes, such as `ssh host "git push"`, is missed on purpose.

## License

MIT; see LICENSE.

## Credits

Adapted and maintained by Sandeep as part of Sandeep Mods. Originally created by [yash-gadodia](https://github.com/yash-gadodia) in [yash-gadodia/claude-mods](https://github.com/yash-gadodia/claude-mods/tree/f4c1c751f67918c73f29977cbd52b8398f8556ac/deploy-verify), MIT.

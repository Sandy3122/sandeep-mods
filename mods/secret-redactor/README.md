# Secret Redactor

Secret Redactor keeps secrets, email addresses and public IP addresses out of your chat by swapping each one for a placeholder, then puts the real value back when a tool runs.

Part of [Sandeep Mods](https://github.com/Sandy3122/claude-mods) · Safety

```
ANTHROPIC_API_KEY=[REDACTED-SECRET-164d0c98]
SUPPORT_EMAIL=[REDACTED-EMAIL-6f096ff7]
EDGE_ORIGIN=[REDACTED-IP-6fc52d2b]
```

*What Claude sees after reading a `.env` file (example values).*

## What it does

- Hides keys and tokens: vendor-shaped keys (`sk-ant-`, `ghp_`, `AKIA`, `sk_live_`, JWTs, Slack and Discord webhooks, private key blocks), passwords inside connection strings, and long random-looking tokens.
- Hides email addresses and public IPv4 and IPv6 addresses.
- Replaces each value with a placeholder such as `[REDACTED-SECRET-1a2b3c4d]`. The same value always gets the same placeholder, so Claude can still tell two values apart.
- Scans what you type, what tools return (`cat .env`, a `Read` of a config, an API answer) and the CLAUDE.md-style blocks attached to your first message.
- Swaps placeholders back to the real values before a tool runs, so a `Bash` command or a `Write` still uses the real key.
- Leaves public ids alone: Stripe object ids such as `price_` and `prod_`, git SHAs, names written in code, documentation emails like `you@example.com`, and private IP ranges such as `127.0.0.1` and `192.168.x.x`.

## Install

```
/plugin marketplace add Sandy3122/claude-mods
/plugin install secret-redactor@sandeep-mods
```

## Use

There is nothing to run. Turn function hooks on first (see Requirements), then work as usual.

- **When you paste a key,** Claude gets the placeholder, and a toast says how many values were hidden.
- **When a tool returns a secret,** the tool row shows a count of hidden values, and Claude sees placeholders.
- **When Claude uses a placeholder in a tool call,** the real value goes into the call. Claude never sees it.
- **Email addresses in the first-message blocks** are left as they are. Claude Code puts your own address there so Claude knows who you are.

A secret that Claude writes itself is not scanned, and the placeholders are forgotten when the session ends.

## Settings

| Option | Default | What it does |
| --- | --- | --- |
| `secrets` | `true` | Hide vendor-shaped keys and high-entropy tokens |
| `pii` | `true` | Hide email addresses and public IP addresses |
| `restoreInToolInputs` | `true` | Put the real value back before a tool runs |
| `notify` | `true` | Show a count on the tool row and a toast on a prompt |
| `minEntropy` | `3.6` | Bits per character a mixed-case token must pass; raise it to hide less |
| `minLength` | `24` | Shortest token the entropy test looks at (never below 8) |
| `contextMinEntropy` | `3.0` | Bits per character when a key name such as `API_KEY=` sits in front |
| `redactPrivateIps` | `false` | Also hide `127.x`, `10.x`, `192.168.x` and other reserved ranges |
| `allow` | empty | Exact strings to leave alone, separated by commas |
| `allowEmails` | empty | Addresses, or a domain written as `@example.com`, separated by commas |
| `allowPrefixes` | empty | Extra id prefixes to treat as public, separated by commas |
| `denyPrefixes` | empty | Prefixes to test for secrets even though they look like a public id |

Change them in `/plugin` → **Installed** → **secret-redactor** → **Configure options**, or run `claude plugin configure secret-redactor@sandeep-mods`.

## Requirements

- Claude Code 2.1.287+ (terminal or desktop app Code tab).
- Function hooks turned on. This is an early-access feature that is off by default, and the mod does nothing without it. Add `"env": { "CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1" }` to `~/.claude/settings.json`, or start one session with `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude`.

## What it can access

- **Hooks:** the prompt you submit, every tool call and its result, and the blocks attached to your first message.
- **Reads:** all of that text, to look for secrets and personal data. It decodes nothing and sends nothing anywhere.
- **Network and models:** none. It makes no network requests and calls no model, so it costs no tokens.
- **Runs programs:** none.
- **Writes files:** none. The mapping from placeholder to real value stays in memory and is dropped when the session ends.
- **Changes what a tool sees:** with `restoreInToolInputs` on, it rewrites a placeholder in a tool's input back to the real value. It never approves or denies a tool call. It shows a toast and a notice on the tool row when something is hidden.

## Troubleshooting

- **Nothing is hidden.** Check that function hooks are on (see Requirements), then run `/plugin` and look for `secret-redactor` under **Errors**. Your organization may allow only managed mods, or `disableAllHooks` may be set.
- **A real secret was missed.** Lower `minEntropy` or `minLength`, or put a name like `API_KEY=` in front of it. Short or hex-only values are only hidden when a key name sits beside them.
- **Something harmless is hidden.** Add it to `allow`, or its email to `allowEmails`, or its id prefix to `allowPrefixes`.
- **A placeholder shows up in a file or command.** Placeholders are swapped back only inside tool inputs, and only when `restoreInToolInputs` is on. A placeholder from an earlier session means nothing in a new one.
- **Running the tests.** Run `claude plugin test` on the mod folder. It runs `tests/detect.test.ts`, which checks the must-hide list, the must-keep list and the round trip.

## License

MIT; see LICENSE.

## Credits

Adapted and maintained by Sandeep as part of Sandeep Mods. Originally created by [ray-amjad](https://github.com/ray-amjad) in [ray-amjad/awesome-claude-code-function-hooks](https://github.com/ray-amjad/awesome-claude-code-function-hooks/tree/12b5fea27a4bd1b88cd9c9b6abc1efc0756c6625/plugins/secret-redactor), MIT.

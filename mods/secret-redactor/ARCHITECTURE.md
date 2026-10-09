# Secret Redactor: architecture

## Overview

Secret Redactor scans text on its way to the model, replaces each secret, email address or IP address with a placeholder, and keeps the real value in an in-memory vault. Before a tool runs, placeholders in its input are swapped back.

```
prompt.submit   ─▶ scrub text ─────────────▶ model sees placeholders
tool.call in    ─▶ restore placeholders ───▶ tool gets real values
tool.call out   ─▶ scrub result ───────────▶ model sees placeholders
prompt.context  ─▶ scrub secrets only ─────▶ first-message blocks
vault (module-level maps, memory only, dropped at session end)
```

## Files

| File | Role |
| --- | --- |
| `hooks/hooks.json` | Points at `./redact.ts` |
| `hooks/redact.ts` | The vault, the secret and PII detectors, the object walker, config parsing and the three hooks |
| `tests/detect.test.ts` | Tests for `claude plugin test`: a must-hide list, a must-keep list and a round-trip check |
| `tests/fixtures/sample.env` | Fake credentials for an end-to-end run |

## Events hooked

| Event (matcher) | What the hook does | Gating? |
| --- | --- | --- |
| `prompt.submit` | Scrubs the typed text for secrets and PII; toasts a count | Yes (rewrites) |
| `tool.call` | Restores placeholders in the input, runs the tool, scrubs the result and text; adds a notice with the count | Yes (rewrites) |
| `prompt.context` | Scrubs secrets (not PII) in the blocks attached to the first message | Yes (rewrites) |

## Calls on $

| Call | Why |
| --- | --- |
| `$.ui.toast` | Tell you how many values a prompt had hidden |
| `$.ui.notice` | Show the count on the tool row |

## State

- `$.state`: none.
- `$.store`: none.
- Files on disk: none.
- Module memory: `byValue` and `byTag` maps (value to placeholder and back) and a `hidden` counter. They live for the session only. A placeholder is `[REDACTED-<SECRET|EMAIL|IP>-<8 hex>]`, the FNV-1a hash of the value.

## Drawing

No band or pane. It uses a toast on a prompt and a notice on the tool row, on every surface that shows them.

## Settings flow

`userConfig` options are read once in `register` and normalised by `makeConfig`; wrong types fall back to the defaults, and `minLength` is never below 8. Comma-separated string options become lists. Changes apply after a restart.

Secret tests run in order: vendor patterns, private key blocks, passwords in URLs, then candidate tokens. A candidate is skipped if it is a public Stripe-style id prefix, a known public shape, a digit run, or a name made of words. A hex run needs a key name beside it. The walker visits strings in plain objects and arrays up to depth 12 and skips image fields (`data`, `base64`, `b64_json`, `imageData`, `thumbnail`) and strings over 8 MB.

## Testing

`tests/detect.test.ts` runs under `claude plugin test` with the Claude Code test kit. It checks 13 values that must be hidden, 23 that must be kept, that a value always gets the same placeholder, and that restoring a placeholder returns the original. The original repository also ran `claude plugin validate` and a manual `claude --plugin-dir` run against `tests/fixtures/sample.env`. The `tsconfig.json` only covers `hooks`; the tests folder is checked by running it.

## Known limits

- It scans only what the model reads. A secret that Claude writes itself is not hidden.
- The vault is memory only; placeholders from an earlier session cannot be restored.
- Detection is heuristic. Short non-hex tokens without a nearby key name can be missed, and odd identifiers can be hidden by mistake; use the `allow*` options.
- Placeholders are restored only inside tool inputs, not in plain model text.
- Private IP ranges are left visible unless `redactPrivateIps` is on.
- Function hooks must be enabled in Claude Code for the mod to do anything.
- Never rename the plugin (`secret-redactor`) or the marketplace (`sandeep-mods`); existing installs use those names.

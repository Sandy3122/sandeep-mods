# WeekToken: architecture

## Overview

WeekToken turns the rate-limit figures Claude Code reports into samples (time plus usage and reset time per quota), keeps them in the mod's store, and draws pace from them. The pure maths lives in `pace.ts`; `register.tsx` gathers readings and draws.

```
session.measure, turn.complete ─▶ samples (5-hour, 7-day) ─▶ $.store samples
~/.claude.json cachedUsageUtilization (every 5 min) ───────▶ per-model samples
Refresh ─▶ $.http.fetch usage endpoint (or claude -p /usage) ─▶ samples
~/.weektoken/samples.jsonl (every 10 min) ─▶ imported history
samples ─▶ pace.ts ─▶ $.state bandShow ─▶ AbovePrompt band
                    └▶ $.state view    ─▶ Pane (rings, forecast, burn-up chart)
```

## Files

| File | Role |
| --- | --- |
| `hooks/hooks.json` | Points at `./register.tsx` |
| `hooks/register.tsx` | The hooks, `/weektoken`, sampling, history import, the band and the pane |
| `hooks/pace.ts` | Pure maths: pace, forecast, status thresholds, sample merging, usage parsing, chart data |
| `hooks/svg.ts` | Draws the pace rings and burn-up chart as SVG |
| `hooks/color.ts`, `hooks/theme.ts` | Colour mixing and the palette per quota and status |
| `hooks/i18n.ts` | English and Chinese language detection |
| `types/index.d.ts` | Types for the mod's `$.state` |
| `tests/pure.test.ts`, `tests/weektoken.test.ts` | Tests for the maths and for the hooks |
| `screenshots/` | Images used by the README |

## Events hooked

| Event (matcher) | What the hook does | Gating? |
| --- | --- | --- |
| `session.start` | Registers `/weektoken`, loads samples, reads the sources, starts the 1-, 5- and 10-minute timers, shows a welcome toast once | No |
| `session.measure` | Records the 5-hour and 7-day figures when they change | No |
| `turn.complete` | Records the time and model of each reply | No |
| `command.run` (`weektoken`) | Opens the pane, or hides or shows the band | Yes (answers its own command) |
| `ui.press` | Notes presses on its own pane and passes every press on | No (passes through) |
| `ui.focus` | Passes the event on; on its own pane in the desktop app, runs a button's action when a click only moved focus | Passes through |
| `config.set` (`language`) | Passes the change on, then detects the language again | Passes through |
| `ui.close` (`weektoken`) | Records that the pane closed | Passes through |
| `ui.render` (`AbovePrompt`) | Draws the band, then whatever else draws there | No |
| `ui.render` (`Pane`, request id `weektoken`) | Draws the pane | No |

## Calls on $

| Call | Why |
| --- | --- |
| `$.http.fetch`, `$.session.authorize` | Usage endpoint request on Refresh; Claude Code attaches the login to an opaque handle |
| `$.process.run` | `claude -p --no-session-persistence /usage` (fallback), `defaults read -g AppleLanguages`, `tail` of the history file, `perl` for a large `~/.claude.json` |
| `$.session.usage` | The session's own 5-hour and 7-day figures |
| `$.fs.exists`, `.stat`, `.read` | `~/.claude.json`, the history file, the mod's own `plugin.json` |
| `$.env.get` | `HOME`, `PATH`, language variables, `WEEKTOKEN_LANG`, `WEEKTOKEN_HISTORY`, `CLAUDE_MODS_DISABLE` |
| `$.config.list` | Claude Code's `language` setting |
| `$.state.get`, `$.state.set` | View, band, pane and language state |
| `$.store.get`, `$.store.set` | Samples, activity, band choice, import marker |
| `$.ui.open`, `.close`, `.panes`, `.resolve`, `.toast` | The pane, its open state, components, notices |
| `$.command.register` | `/weektoken` |
| `$.clock.every`, `.after`, `.now` | Timers and the current time |

## State

- `$.state` (`weektoken.*`): `samples`, `view`, `note`, `band`, `bandKey`, `bandShow`, `confirmHide`, `paneOpen`, `lang`, `activity`, `version`.
- `$.store`: `samples` (up to 8000, oldest dropped first) with `samplesRev`, `activity`, `band`, `bandKey`, `view`, `historyMtime`, `welcomed`.
- Files on disk: none written.

## Drawing

The band draws on `AbovePrompt` and changes only when its rounded display value changes, so passing time alone causes no redraw. The pane draws the pace rings and burn-up chart as SVG images. Past the "Inspect lines" button, the chart becomes hoverable boxes. The terminal uses a dropdown for quotas where the desktop app uses arrows. Surfaces without a select fall back to previous and next buttons.

## Settings flow

There are no `userConfig` options. Three environment variables are read at session start (`WEEKTOKEN_LANG`, `WEEKTOKEN_HISTORY`, `CLAUDE_MODS_DISABLE`). Thresholds are constants in `pace.ts`.

## Testing

`tests/pure.test.ts` covers the maths in `pace.ts`. `tests/weektoken.test.ts` covers the hooks, sampling, history import and drawing. Run `claude plugin test mods/weektoken`.

## Known limits

- Needs a subscription login; API-key sessions have no limits to show.
- History starts at install, because the usage API reports only current values.
- `claude plugin validate` notes that the `command.run`, `ui.focus`, `config.set` and `ui.close` hooks have no `.catch`.
- The plugin has no `tsconfig.json`, unlike the standard layout.
- The `documentationUrl`, `supportUrl`, `privacyPolicyUrl` and `termsOfServiceUrl` in `plugin.json` still point at the original author's repository.
- The pane title in code is `WeekToken`; the display name is `WeekToken`.
- Never rename the plugin (`weektoken`) or the marketplace (`sandeep-mods`); installs and `$.state` keys use those names.

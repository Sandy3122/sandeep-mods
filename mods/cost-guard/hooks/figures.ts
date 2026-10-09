import type { PluginOptions } from 'claude-code'

import type { Level, Meter } from '../types'

export type Settings = {
  warnAtTokens: number
  urgeAtTokens: number
  warnAtUsd: number
  replyToastUsd: number
  largeFileKb: number
  largePasteTokens: number
  inlineMarkdownTokens: number
  longChatAction: 'warn' | 'hold-once'
  convertDocs: boolean
  localCurrencySymbol: string
  usdToLocalRate: number
}

export const DEFAULTS: Settings = {
  warnAtTokens: 80_000,
  urgeAtTokens: 150_000,
  warnAtUsd: 5,
  replyToastUsd: 1,
  largeFileKb: 150,
  largePasteTokens: 15_000,
  inlineMarkdownTokens: 20_000,
  longChatAction: 'warn',
  convertDocs: true,
  localCurrencySymbol: '',
  usdToLocalRate: 0,
}

const count = (options: PluginOptions, key: keyof Settings, fallback: number) => {
  const value = options[key]

  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback
}

export const readSettings = (options: PluginOptions): Settings => ({
  warnAtTokens: count(options, 'warnAtTokens', DEFAULTS.warnAtTokens),
  urgeAtTokens: count(options, 'urgeAtTokens', DEFAULTS.urgeAtTokens),
  warnAtUsd: count(options, 'warnAtUsd', DEFAULTS.warnAtUsd),
  replyToastUsd: count(options, 'replyToastUsd', DEFAULTS.replyToastUsd),
  largeFileKb: count(options, 'largeFileKb', DEFAULTS.largeFileKb),
  largePasteTokens: count(options, 'largePasteTokens', DEFAULTS.largePasteTokens),
  inlineMarkdownTokens: count(options, 'inlineMarkdownTokens', DEFAULTS.inlineMarkdownTokens),
  longChatAction: options.longChatAction === 'hold-once' ? 'hold-once' : 'warn',
  convertDocs: options.convertDocs !== false,
  localCurrencySymbol:
    typeof options.localCurrencySymbol === 'string' ? options.localCurrencySymbol.trim() : '',
  usdToLocalRate: count(options, 'usdToLocalRate', DEFAULTS.usdToLocalRate),
})

/** Rough token count of a text: about four characters a token. */
export const tokensOf = (chars: number) => Math.ceil(chars / 4)

const grouped = (whole: number) => String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

/** `$0.18`, `$12.40`, `$140`, with the local figure beside it when configured. */
export const money = (usd: number, settings: Settings) => {
  const dollars =
    usd > 0 && usd < 0.01 ? '<$0.01' : usd < 100 ? `$${usd.toFixed(2)}` : `$${grouped(Math.round(usd))}`
  const { localCurrencySymbol: symbol, usdToLocalRate: rate } = settings

  if (symbol === '' || rate <= 0) {
    return dollars
  }

  const local = usd * rate
  const shown = local < 10 ? local.toFixed(2) : grouped(Math.round(local))

  return `${dollars} (${symbol}${shown})`
}

/** `850`, `9.4k`, `48k`, `1.2M`. */
export const tokens = (n: number) =>
  n < 1000
    ? String(Math.round(n))
    : n < 1_000_000
      ? `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`
      : `${(n / 1_000_000).toFixed(1)}M`

export const RANK: Record<Level, number> = { ok: 0, warn: 1, urge: 2 }

export const levelOf = (meter: Meter, settings: Settings): Level => {
  const size = meter.tokens ?? 0

  if (size >= settings.urgeAtTokens) {
    return 'urge'
  }

  return size >= settings.warnAtTokens || meter.chatUsd >= settings.warnAtUsd ? 'warn' : 'ok'
}

/** The store key of a local calendar day: `day:2026-10-09`. */
export const dayKey = (ms: number) => {
  const at = new Date(ms)
  const two = (n: number) => String(n).padStart(2, '0')

  return `day:${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())}`
}

export const EMPTY_METER: Meter = {
  chatUsd: 0,
  tokens: null,
  window: 0,
  percent: null,
  lastReplyUsd: null,
  replies: 0,
  todayUsd: 0,
  planPercent: null,
}

/** The one line the meter draws and the status line shortens. */
export const meterLine = (meter: Meter, settings: Settings) => {
  const parts = [`this chat ≈${money(meter.chatUsd, settings)}`]

  if (meter.lastReplyUsd !== null) {
    parts.push(`last reply ${money(meter.lastReplyUsd, settings)}`)
  }

  parts.push(`today ${money(meter.todayUsd, settings)}`)

  if (meter.tokens !== null) {
    const share = meter.percent === null ? '' : ` (${Math.round(meter.percent)}%)`
    parts.push(`context ${tokens(meter.tokens)}${meter.window > 0 ? ` of ${tokens(meter.window)}` : ''}${share}`)
  }

  if (meter.planPercent !== null) {
    parts.push(`plan limit ${Math.round(meter.planPercent)}% used`)
  }

  return parts.join(' · ')
}

/** What the person should hear at each level, or nothing. */
export const advice = (level: Level, meter: Meter, settings: Settings) => {
  const size = tokens(meter.tokens ?? 0)
  const reply = meter.lastReplyUsd === null ? '' : ` Your last reply cost ${money(meter.lastReplyUsd, settings)}.`

  if (level === 'urge') {
    return `This chat is very long: every new message re-sends about ${size} tokens.${reply} Start a fresh session to cut the cost: press Handoff to save a short summary, then run /clear and ask Claude to read HANDOFF.md.`
  }

  if (level === 'warn' && (meter.tokens ?? 0) >= settings.warnAtTokens) {
    return `This chat is getting long: each message now re-sends about ${size} tokens.${reply} When you switch topics, start a fresh session (/clear).`
  }

  if (level === 'warn') {
    return `This chat has cost ${money(meter.chatUsd, settings)} so far. A fresh session for the next task keeps each message cheap.`
  }

  return null
}

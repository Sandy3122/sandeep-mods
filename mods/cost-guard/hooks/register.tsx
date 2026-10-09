import { atom, read, update } from 'claude-code'
import type { EngineInterface, FsStat, Register, SessionMeasureInput } from 'claude-code'

import type { Converted, Intake, Level, Reply } from '../types'
import { CONVERTIBLE, MARK, baseName, convertersFor, extensionOf, isScanned, tagOf } from './convert'
import type { Markdown } from './convert'
import {
  EMPTY_METER,
  RANK,
  advice,
  dayKey,
  levelOf,
  meterLine,
  money,
  readSettings,
  tokens,
  tokensOf,
} from './figures'
import type { Settings } from './figures'

const meter = atom({ plugin: 'cost-guard', key: 'meter' } as const, EMPTY_METER)
const intake = atom({ plugin: 'cost-guard', key: 'intake' } as const, null)
const hiddenLevel = atom({ plugin: 'cost-guard', key: 'hiddenLevel' } as const, null)
const converted = atom({ plugin: 'cost-guard', key: 'converted' } as const, [])
const replies = atom({ plugin: 'cost-guard', key: 'replies' } as const, [])
const ledgerUsd = atom({ plugin: 'cost-guard', key: 'ledgerUsd' } as const, 0)
const chatBaseUsd = atom({ plugin: 'cost-guard', key: 'chatBaseUsd' } as const, 0)
const turnStartUsd = atom({ plugin: 'cost-guard', key: 'turnStartUsd' } as const, 0)
const heldAtTokens = atom({ plugin: 'cost-guard', key: 'heldAtTokens' } as const, 0)
const redirected = atom({ plugin: 'cost-guard', key: 'redirected' } as const, [])

const DAY_MS = 86_400_000
const KEEP_DAYS = 90
const PREVIEW_LINES = 300
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const HANDOFF_PROMPT =
  'Write a handoff note so this work can continue in a fresh, cheaper session. ' +
  'Save it to HANDOFF.md in the project folder, under 250 words: the goal, what is done, ' +
  'key decisions, the files involved, and the next steps. Then reply with one line telling me ' +
  'to run /clear and start the new session with: read HANDOFF.md and continue.'

/** Which converter worked last for each file type, so the next file tries it first. */
const remembered = new Map<string, number>()
let hasWarnedNoConverter = false

async function showStatus($: EngineInterface, settings: Settings) {
  const now = await read($, meter)
  const size = now.tokens === null ? '' : ` · ctx ${tokens(now.tokens)}`

  $.ui.status(`≈${money(now.chatUsd, settings)} this chat${size}`)
}

async function addToDay($: EngineInterface, usd: number) {
  const key = dayKey(await $.clock.now())
  const total = Number((await $.store.get(key)) ?? 0) + usd

  await $.store.set(key, Math.round(total * 1e6) / 1e6)

  return total
}

async function pruneDays($: EngineInterface) {
  const oldest = dayKey((await $.clock.now()) - KEEP_DAYS * DAY_MS)

  for (const key of await $.store.keys()) {
    if (key.startsWith('day:') && key < oldest) {
      await $.store.delete(key)
    }
  }
}

async function measure($: EngineInterface, e: SessionMeasureInput, settings: Settings) {
  const ledger = e.cost?.usd
  let today: number | undefined

  if (ledger !== undefined) {
    const counted = await read($, ledgerUsd)
    const fresh = ledger >= counted ? ledger - counted : ledger

    await update($, ledgerUsd, () => ledger)

    if (ledger < (await read($, chatBaseUsd))) {
      await update($, chatBaseUsd, () => 0)
    }

    if (fresh > 0) {
      today = await addToDay($, fresh)
    }
  }

  const base = await read($, chatBaseUsd)
  const plan = e.rateLimits.map(limit => limit.percentUsed)

  await update($, meter, was => ({
    ...was,
    chatUsd: ledger === undefined ? was.chatUsd : Math.max(0, ledger - base),
    tokens: e.context.tokens ?? null,
    window: e.context.window,
    percent: e.context.percent ?? null,
    todayUsd: today ?? was.todayUsd,
    planPercent: plan.length === 0 ? null : Math.max(...plan),
  }))

  const level = levelOf(await read($, meter), settings)
  const hidden = await read($, hiddenLevel)

  if (hidden !== null && RANK[level] > RANK[hidden]) {
    await update($, hiddenLevel, () => null)
  }

  await showStatus($, settings)
}

async function isOurs($: EngineInterface, path: string) {
  const text = await $.fs.read(path).catch(() => undefined)

  return text !== undefined && text.startsWith(MARK)
}

async function reusable($: EngineInterface, path: string, source: FsStat) {
  const copy = await $.fs.stat(path).catch(() => undefined)

  if (copy === undefined || copy.kind !== 'file' || copy.mtimeMs < source.mtimeMs) {
    return undefined
  }

  return (await isOurs($, path)) ? copy : undefined
}

async function runConverters($: EngineInterface, source: string) {
  const ext = extensionOf(source)
  const tries = convertersFor(ext, source)
  const known = remembered.get(ext)
  const first = known === undefined ? undefined : tries[known]
  const order = first === undefined ? tries : [first, ...tries.filter(argv => argv !== first)]

  for (const argv of order) {
    const ran = await $.process.run(argv, { timeoutMs: 120_000 }).catch(() => undefined)

    if (ran !== undefined && ran.exitCode === 0 && ran.stdout.trim().length > 0) {
      remembered.set(ext, tries.indexOf(argv))

      return ran.isStdoutTruncated ? `${ran.stdout}\n\n(cut at 4 MB by cost-guard)\n` : ran.stdout
    }
  }

  return undefined
}

/**
 * Turns a document into a markdown copy beside it (`report.docx.md`), or, where
 * that folder cannot be written, under the project's `.claude/cost-guard/`.
 * A copy newer than its source is used again as it is.
 */
async function toMarkdown($: EngineInterface, source: string, stat: FsStat): Promise<Markdown> {
  const root = await $.session.root()
  const places = [`${source}.md`, `${root}/.claude/cost-guard/${baseName(source)}-${tagOf(source)}.md`]

  for (const place of places) {
    const copy = await reusable($, place, stat)

    if (copy !== undefined) {
      return { isMade: true, path: place, tokens: tokensOf(copy.size), isReused: true }
    }
  }

  const text = await runConverters($, source)

  if (text === undefined) {
    return { isMade: false, why: 'no-converter' }
  }

  if (extensionOf(source) === 'pdf' && isScanned(text)) {
    return { isMade: false, why: 'scanned' }
  }

  const body = `${MARK}${baseName(source)}. Claude reads this instead of the original to save tokens; safe to delete. -->\n\n${text.trim()}\n`

  for (const place of places) {
    const isTaken = (await $.fs.exists(place).catch(() => true)) && !(await isOurs($, place))

    if (isTaken) {
      continue
    }

    const isWritten = await $.fs
      .write(place, body)
      .then(() => true)
      .catch(() => false)

    if (isWritten) {
      return { isMade: true, path: place, tokens: tokensOf(body.length), isReused: false }
    }
  }

  return { isMade: false, why: 'unwritable' }
}

async function convert($: EngineInterface, path: string) {
  const stat = await $.fs.stat(path).catch(() => undefined)

  if (stat === undefined || stat.kind !== 'file') {
    return undefined
  }

  const made = await toMarkdown($, path, stat)

  if (made.isMade) {
    const entry: Converted = { source: path, markdown: made.path, tokens: made.tokens }

    await update($, converted, list => [...list.filter(one => one.source !== path), entry].slice(-50))

    return made
  }

  if (made.why === 'no-converter' && !hasWarnedNoConverter) {
    hasWarnedNoConverter = true
    $.ui.log(
      `cost-guard: could not turn ${baseName(path)} into markdown, so Claude reads the original. ` +
        'Install a converter once: pip install "markitdown[all]" (or pandoc, or poppler for PDFs).',
    )
  }

  return undefined
}

async function report($: EngineInterface, settings: Settings) {
  const now = await read($, meter)
  const list: readonly Reply[] = await read($, replies)
  const files: readonly Converted[] = await read($, converted)
  const at = await $.clock.now()
  const days: { label: string; usd: number }[] = []

  for (let back = 0; back < 7; back += 1) {
    const when = at - back * DAY_MS
    const usd = Number((await $.store.get(dayKey(when))) ?? 0)

    days.push({ label: back === 0 ? 'today' : (WEEKDAYS[new Date(when).getDay()] ?? ''), usd })
  }

  const week = days.reduce((sum, day) => sum + day.usd, 0)
  const priciest = list.reduce((most, reply) => Math.max(most, reply.usd), 0)
  const lines = [
    'Spend, at API list prices (on a Pro, Max or Team plan this is the API-equivalent value, not your bill)',
    `  This chat     ${money(now.chatUsd, settings)} over ${now.replies} ${now.replies === 1 ? 'reply' : 'replies'}`,
  ]

  if (now.lastReplyUsd !== null) {
    lines.push(`  Last reply    ${money(now.lastReplyUsd, settings)}, priciest ${money(priciest, settings)}`)
  }

  if (now.tokens !== null) {
    lines.push(`  Context now   ${tokens(now.tokens)} tokens of ${tokens(now.window)}, re-sent with every message`)
  }

  if (now.planPercent !== null) {
    lines.push(`  Plan limit    ${Math.round(now.planPercent)}% of the fullest usage window used`)
  }

  lines.push(`  Today         ${money(days[0]?.usd ?? 0, settings)} (every session on this machine)`)
  lines.push(
    `  Last 7 days   ${money(week, settings)}: ${days
      .slice(1)
      .map(day => `${day.label} ${money(day.usd, settings)}`)
      .join(', ')}`,
  )

  if (files.length > 0) {
    lines.push(`Read as markdown instead of the original: ${files.length} file${files.length === 1 ? '' : 's'}`)

    for (const file of files.slice(-5)) {
      lines.push(`  ${baseName(file.source)} → ${file.markdown} (~${tokens(file.tokens)} tokens)`)
    }
  }

  lines.push(
    'Spend less: one session per task (/clear between tasks), mention files with @path so documents ' +
      'become markdown, ask for the pages or sections you need, and /compact a chat you must keep going.',
  )

  return lines.join('\n')
}

async function resetChat($: EngineInterface, settings: Settings) {
  const ledger = await read($, ledgerUsd)

  await update($, chatBaseUsd, () => ledger)
  await update($, replies, () => [])
  await update($, intake, () => null)
  await update($, heldAtTokens, () => 0)
  await update($, hiddenLevel, () => null)
  await update($, redirected, () => [])
  await update($, meter, was => ({
    ...was,
    chatUsd: 0,
    tokens: null,
    percent: null,
    lastReplyUsd: null,
    replies: 0,
  }))
  await showStatus($, settings)
}

async function recordReply($: EngineInterface, inputTokens: number, settings: Settings) {
  const { cost } = await $.session.usage()
  const start = await read($, turnStartUsd)
  const spent = Math.max(0, (cost?.usd ?? start) - start)
  const reply: Reply = { usd: spent, inputTokens }

  await update($, replies, list => [...list, reply].slice(-100))
  await update($, meter, was => ({ ...was, lastReplyUsd: spent, replies: was.replies + 1 }))

  if (settings.replyToastUsd > 0 && spent >= settings.replyToastUsd) {
    $.ui.toast(`That reply cost ${money(spent, settings)}. Long chats and big files make every reply cost more.`, {
      timeoutMs: 6000,
    })
  }

  await showStatus($, settings)
}

async function holdOnce($: EngineInterface, text: string, settings: Settings) {
  const now = await read($, meter)
  const size = now.tokens ?? 0

  if (size < settings.urgeAtTokens || (await read($, heldAtTokens)) !== 0) {
    return undefined
  }

  await update($, heldAtTokens, () => size)
  $.clock.after(150, () => void $.prompt.fill({ text, mode: 'replace' }))

  const last = now.lastReplyUsd === null ? '' : ` (your last reply cost ${money(now.lastReplyUsd, settings)})`

  return (
    `cost-guard: this chat re-sends about ${tokens(size)} tokens with every message${last}. ` +
    'Your text is back in the box: press Enter to send it here anyway, or run /clear and start fresh.'
  )
}

async function noteIntake($: EngineInterface, heavy: Intake | null) {
  await update($, intake, () => heavy)

  if (heavy !== null) {
    $.ui.toast(
      `Heavy message: about ${tokens(heavy.tokens)} tokens. It is re-sent with every later message in this chat.`,
      { timeoutMs: 6000 },
    )
  }
}

async function noteLargeFile($: EngineInterface, name: string, size: number) {
  await update($, intake, was => ({
    tokens: (was?.tokens ?? 0) + size,
    reasons: [...(was?.reasons ?? []), `@${name}, about ${tokens(size)} tokens`],
  }))
  $.ui.toast(
    `@${name} is large (about ${tokens(size)} tokens). It stays in this chat and is re-sent with every message; ` +
      'mention a line range (@file#L1-200) when you only need part of it.',
    { timeoutMs: 7000 },
  )
}

/** What a message added on its own, or null when it was light. */
function weigh(text: string, attached: readonly { type: string }[], settings: Settings): Intake | null {
  const reasons: string[] = []
  const typed = tokensOf(text.length)
  const documents = attached.filter(item => item.type === 'document').length
  const images = attached.filter(item => item.type === 'image').length
  let added = typed

  if (typed >= settings.largePasteTokens) {
    reasons.push('a long paste')
  }

  if (documents > 0) {
    added += documents * 5000
    reasons.push(
      `${documents} attached document${documents === 1 ? '' : 's'} sent whole; mention files as @path instead so they become markdown`,
    )
  }

  if (images >= 3) {
    added += images * 1600
    reasons.push(`${images} images`)
  }

  return reasons.length === 0 ? null : { tokens: added, reasons }
}

export const register: Register = (on, options) => {
  const settings = readSettings(options)

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'spend',
      description: 'What this chat, today and this week cost, and how to spend less',
    })
    await pruneDays($)

    const today = Number((await $.store.get(dayKey(await $.clock.now()))) ?? 0)

    await update($, meter, was => ({ ...was, todayUsd: today }))

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    const result = await next(e)

    await measure($, e, settings)

    return result
  })

  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      await resetChat($, settings)
    }

    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    const { cost } = await $.session.usage()

    await update($, turnStartUsd, () => cost?.usd ?? 0)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)

    if (e.agentId === undefined) {
      const usage = e.usage
      const inputTokens =
        usage === undefined ? 0 : usage.input_tokens + usage.cache_read_input_tokens + usage.cache_creation_input_tokens

      await recordReply($, inputTokens, settings)
    }

    return result
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.origin.kind !== 'composer' && e.origin.kind !== 'bridge') {
      return next(e)
    }

    const attached = e.attachments ?? []

    if (settings.longChatAction === 'hold-once' && attached.length === 0) {
      const reason = await holdOnce($, e.text, settings)

      if (reason !== undefined) {
        return { drop: reason }
      }
    }

    await noteIntake($, weigh(e.text, attached, settings))

    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.mention', async ($, e, next) => {
    const stat = await $.fs.stat(e.path).catch(() => undefined)

    if (stat === undefined || stat.kind !== 'file') {
      return next(e)
    }

    const name = baseName(e.path)
    const isWhole = e.offset === undefined && e.limit === undefined

    if (settings.convertDocs && isWhole && CONVERTIBLE.has(extensionOf(e.path))) {
      const made = await convert($, e.path)

      if (made !== undefined && made.isMade) {
        const isPreview = made.tokens > settings.inlineMarkdownTokens
        const ran = await next(
          isPreview ? { ...e, path: made.path, offset: 1, limit: PREVIEW_LINES } : { ...e, path: made.path },
        )

        if (ran.deny !== undefined || ran.type === null) {
          return ran
        }

        $.ui.log(
          `cost-guard: read ${name} as markdown (~${tokens(made.tokens)} tokens)` +
            `${isPreview ? `, first ${PREVIEW_LINES} lines attached` : ''}: ${made.path}`,
        )

        const note = isPreview
          ? `cost-guard: ${e.path} was converted to markdown at ${made.path} (~${tokens(made.tokens)} tokens). ` +
            `Only its first ${PREVIEW_LINES} lines are attached, to save tokens. Read further parts with the Read ` +
            'tool (offset and limit) or search it with Grep, only as far as the task needs.'
          : `cost-guard: the attached text of ${name} is its markdown copy at ${made.path}, made to save tokens.`

        return { ...ran, context: [...(ran.context ?? []), note] }
      }
    }

    if (stat.size >= settings.largeFileKb * 1024) {
      await noteLargeFile($, name, tokensOf(stat.size))
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Read' }, async ($, e, next) => {
    const ext = extensionOf(e.file_path)

    if (!settings.convertDocs || !CONVERTIBLE.has(ext)) {
      return next(e)
    }

    if ((await read($, redirected)).includes(e.file_path)) {
      return next(e)
    }

    const made = await convert($, e.file_path)

    if (made === undefined || !made.isMade) {
      return next(e)
    }

    const original = e.file_path

    await update($, redirected, list => [...list, original].slice(-200))

    const { pages: _pages, ...rest } = e
    const ran = await next({ ...rest, file_path: made.path })

    if (ran.deny !== undefined) {
      return ran
    }

    const isVisual = ext === 'pdf' || ext === 'pptx' || ext === 'odp'
    const note =
      `cost-guard: to save tokens this is the markdown copy of ${original} (${made.path}, ~${tokens(made.tokens)} tokens); ` +
      'read more of it with offset and limit.' +
      (isVisual
        ? ` If the task truly needs the original's pictures or layout, Read ${original} again and it goes through as is.`
        : '')

    return { ...ran, context: [...(ran.context ?? []), note] }
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'spend' }, async $ => ({ text: await report($, settings) }))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }

    const now = await read($, meter)
    const heavy = await read($, intake)
    const hidden = await read($, hiddenLevel)
    const level: Level = levelOf(now, settings)

    if (hidden !== null && RANK[level] <= RANK[hidden]) {
      return next(e)
    }

    if (now.tokens === null && now.chatUsd === 0 && heavy === null) {
      return next(e)
    }

    const { Box, Button, Text } = $.ui.resolve(e)
    const tip = advice(level, now, settings)
    const color = level === 'urge' ? 'error' : level === 'warn' ? 'warning' : 'subtle'

    return (
      <Box flexDirection="column">
        <Text wrap="truncate-end" color={color}>
          Spend · {meterLine(now, settings)}
        </Text>
        {heavy !== null && (
          <Text color="warning">
            Your last message added about {tokens(heavy.tokens)} tokens ({heavy.reasons.join('; ')}). It is re-sent
            with every later message in this chat.
          </Text>
        )}
        {tip !== null && <Text color={color}>{tip}</Text>}
        <Box flexDirection="row">
          {level === 'urge' && (
            <Button
              key="handoff"
              label="Handoff"
              hotkey="h"
              variant="primary"
              onPress={() => $.prompt.submit({ text: HANDOFF_PROMPT, asUser: true })}
            />
          )}
          <Button key="hide" label="Hide" onPress={() => update($, hiddenLevel, () => level)} />
        </Box>
      </Box>
    )
  })
}

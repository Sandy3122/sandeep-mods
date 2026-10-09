import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const NOW = new Date(2026, 9, 9, 12, 0, 0).getTime()
const SURFACES = ['terminal', 'desktop'] as const

const BAND = {
  plugin: 'cost-guard',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 12,
    bodyColumns: 140,
    scroll: { offset: 0, bodyRows: 12 },
    view: {},
  },
} as const

type File = { size: number; mtimeMs: number; text?: string }

type World = {
  usd: number
  status: (string | undefined)[]
  toasts: string[]
  logs: string[]
  written: Record<string, string>
  converter: string
}

/** Everything beneath the mod: a clock, a store, files, a converter and the session's ledger. */
function world(on: On, files: Record<string, File> = {}): World {
  const w: World = {
    usd: 0,
    status: [],
    toasts: [],
    logs: [],
    written: {},
    converter: '# Report\n\nQuarterly numbers went up.\n',
  }

  mock.clock(on, { now: NOW })
  mock.store(on)
  on('ui.status', ($, e) => {
    w.status.push(e.text)

    return { value: undefined }
  })
  on('ui.toast', ($, e) => {
    w.toasts.push(e.text)

    return { value: undefined }
  })
  on('ui.log', ($, e) => {
    w.logs.push(e.text)

    return { value: undefined }
  })
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine band</Text>
  })
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('session.root', () => ({ value: '/work' }))
  on('session.usage', () => ({
    value: { startedAt: NOW, context: { window: 200_000 }, rateLimits: [], cost: { usd: w.usd } },
  }))
  on('session.measure', ($, e) => ({ changed: e.changed }))
  on('fs.stat', ($, e) => {
    const written = w.written[e.path]
    const file = written === undefined ? files[e.path] : { size: written.length, mtimeMs: NOW }

    if (file === undefined) {
      throw new Error(`ENOENT: ${e.path}`)
    }

    return { value: { kind: 'file' as const, size: file.size, mtimeMs: file.mtimeMs, isLink: false } }
  })
  on('fs.exists', ($, e) => ({ value: e.path in files || e.path in w.written }))
  on('fs.read', ($, e) => {
    const text = w.written[e.path] ?? files[e.path]?.text

    if (text === undefined) {
      throw new Error(`ENOENT: ${e.path}`)
    }

    return { value: text }
  })
  on('fs.write', ($, e) => {
    w.written[e.path] = e.text

    return { value: undefined }
  })
  on('process.run', ($, e) => ({
    value:
      e.argv[0] === 'markitdown'
        ? { exitCode: 0, stdout: w.converter, stderr: '', isStdoutTruncated: false, isStderrTruncated: false }
        : { exitCode: 1, stdout: '', stderr: 'not here', isStdoutTruncated: false, isStderrTruncated: false },
  }))

  return w
}

test('the band shows what this chat, the last reply and today cost, on each surface', async ($, on) => {
  const w = world(on)

  w.usd = 1.23
  await $.session.measure({
    context: { tokens: 48_000, window: 200_000, percent: 24 },
    rateLimits: [],
    cost: { usd: 1.23 },
    changed: ['context', 'cost'],
  })

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...BAND, surface })

    expect(await ui.find({ type: 'Text', text: /this chat ≈\$1\.23/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /today \$1\.23/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /context 48k of 200k \(24%\)/ })).toBeDefined()
    expect(await ui.find({ key: 'handoff' })).toBeUndefined()
    await ui.unmount()
  }

  expect(w.status.at(-1)).toBe('≈$1.23 this chat · ctx 48k')

  w.usd = 2
  await $.session.measure({
    context: { tokens: 52_000, window: 200_000, percent: 26 },
    rateLimits: [],
    cost: { usd: 2 },
    changed: ['context', 'cost'],
  })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })

  expect(await ui.find({ type: 'Text', text: /this chat ≈\$2\.00 · today \$2\.00/ })).toBeDefined()
})

test('a long chat turns red, offers a handoff, and Hide quiets it at that level', async ($, on) => {
  world(on)

  await $.session.measure({
    context: { tokens: 160_000, window: 200_000, percent: 80 },
    rateLimits: [],
    cost: { usd: 3 },
    changed: ['context', 'cost'],
  })

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...BAND, surface })

    expect(await ui.find({ type: 'Text', text: /every new message re-sends about 160k tokens/ })).toBeDefined()
    expect(await ui.find({ key: 'handoff' })).toBeDefined()
    await ui.unmount()
  }

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })

  await ui.press({ key: 'hide' })
  expect(await ui.find({ key: 'hide' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: 'engine band' })).toBeDefined()

  await $.session.measure({
    context: { tokens: 165_000, window: 200_000, percent: 82 },
    rateLimits: [],
    cost: { usd: 3.4 },
    changed: ['context', 'cost'],
  })
  expect(await ui.find({ key: 'hide' })).toBeUndefined()
})

test('a reply that costs a lot says so', async ($, on) => {
  const w = world(on)

  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('turn.complete', ($, e) => ({ text: e.answer }))

  w.usd = 0.5
  await $.turn.start({ text: 'summarise the repo', turnId: 't1' })
  w.usd = 2
  await $.session.measure({
    context: { tokens: 96_000, window: 200_000, percent: 48 },
    rateLimits: [],
    cost: { usd: 2 },
    changed: ['context', 'cost'],
  })
  await $.turn.complete({
    answer: 'done',
    durationMs: 9000,
    isAborted: false,
    turnId: 't1',
    reason: 'answer',
    usage: {
      input_tokens: 2000,
      output_tokens: 900,
      cache_read_input_tokens: 90_000,
      cache_creation_input_tokens: 4000,
      model: 'claude-opus-5-5',
    },
  })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })

  expect(await ui.find({ type: 'Text', text: /last reply \$1\.50/ })).toBeDefined()
  expect(w.toasts.some(text => text.startsWith('That reply cost $1.50'))).toBe(true)
})

test('a Word file Claude reads arrives as its markdown copy, and a second read goes through', async ($, on) => {
  const w = world(on, { '/work/report.docx': { size: 300_000, mtimeMs: NOW - 60_000 } })
  const asked: { path: string; hasPages: boolean }[] = []

  on('tool.call', { tool: 'Read' }, ($, e) => {
    asked.push({ path: e.file_path, hasPages: e.pages !== undefined })

    return { result: { type: 'text' } as never, text: 'contents' }
  })

  const first = await $.tool.call({ tool: 'Read', file_path: '/work/report.docx', pages: '1-3' })

  expect(asked[0]).toEqual({ path: '/work/report.docx.md', hasPages: false })
  expect(w.written['/work/report.docx.md']).toContain('Quarterly numbers went up.')
  expect(w.written['/work/report.docx.md']?.startsWith('<!-- cost-guard: markdown copy of report.docx')).toBe(true)
  expect(first.context?.some(note => note.includes('markdown copy of /work/report.docx'))).toBe(true)

  await $.tool.call({ tool: 'Read', file_path: '/work/report.docx' })
  expect(asked[1]?.path).toBe('/work/report.docx')

  await $.tool.call({ tool: 'Read', file_path: '/work/notes.txt' })
  expect(asked[2]?.path).toBe('/work/notes.txt')
})

test('a large @-mentioned PDF is converted and only its first lines are attached', async ($, on) => {
  const w = world(on, { '/work/big.pdf': { size: 2_000_000, mtimeMs: NOW - 60_000 } })
  const seen: { path: string; limit?: number }[] = []

  w.converter = 'A line of the annual report with enough words in it.\n'.repeat(4000)
  on('prompt.mention', ($, e) => {
    seen.push({ path: e.path, limit: e.limit })

    return { type: 'file' }
  })

  const result = await $.prompt.mention({ mention: 'big.pdf', path: '/work/big.pdf' })

  expect(seen[0]).toEqual({ path: '/work/big.pdf.md', limit: 300 })
  expect(result.deny).toBeUndefined()
  expect(result.context?.some(note => note.includes('first 300 lines'))).toBe(true)
})

test('a heavy message is flagged', async ($, on) => {
  const w = world(on)

  on('prompt.submit', ($, e) => ({ text: e.text }))

  await $.prompt.submit({ text: 'x'.repeat(80_000), wait: false, origin: { kind: 'composer' } })

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })

  expect(await ui.find({ type: 'Text', text: /Your last message added about 20k tokens \(a long paste\)/ })).toBeDefined()
  expect(w.toasts.some(text => text.startsWith('Heavy message'))).toBe(true)
})

test('hold-once holds the first message of a very long chat, then lets it through', { options: { longChatAction: 'hold-once' } }, async ($, on) => {
  world(on)

  const sent: string[] = []

  on('prompt.submit', ($, e) => {
    sent.push(e.text)

    return { text: e.text }
  })
  on('prompt.fill', () => ({ isFilled: true }))

  await $.session.measure({
    context: { tokens: 170_000, window: 200_000, percent: 85 },
    rateLimits: [],
    cost: { usd: 4 },
    changed: ['context', 'cost'],
  })

  const held = await $.prompt.submit({ text: 'next question', wait: false, origin: { kind: 'composer' } })

  expect(held.drop).toContain('re-sends about 170k tokens')
  expect(sent).toEqual([])

  await $.prompt.submit({ text: 'next question', wait: false, origin: { kind: 'composer' } })
  expect(sent).toEqual(['next question'])
})

test('/spend reports the chat, today and the week', async ($, on) => {
  world(on)

  await $.session.measure({
    context: { tokens: 30_000, window: 200_000, percent: 15 },
    rateLimits: [{ kind: 'five_hour', percentUsed: 41 }],
    cost: { usd: 0.8 },
    changed: ['context', 'cost', 'rateLimits'],
  })

  const { text } = await $.command.run({
    command: 'spend',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 120 },
  })

  expect(text).toContain('This chat     $0.80')
  expect(text).toContain('Plan limit    41%')
  expect(text).toContain('Today         $0.80')
})

test('a local currency shows beside dollars', { options: { localCurrencySymbol: '₹', usdToLocalRate: 84 } }, async ($, on) => {
  world(on)

  await $.session.measure({
    context: { tokens: 10_000, window: 200_000, percent: 5 },
    rateLimits: [],
    cost: { usd: 2.5 },
    changed: ['context', 'cost'],
  })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })

  expect(await ui.find({ type: 'Text', text: /this chat ≈\$2\.50 \(₹210\)/ })).toBeDefined()
})

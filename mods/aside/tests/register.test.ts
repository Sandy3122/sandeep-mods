import { expect, mock, test } from 'claude-code/testing'

import { MAX_CHARS_PER_ANSWER } from '../hooks/register.ts'

// The Claude Code test kit runs the real hooks over a mocked engine. Everything
// beneath the mod is answered here: what the model says, the transcript, the
// clock, and the core's own answers to the events the mod passes on.

const USAGE = { input_tokens: 30, output_tokens: 100, cache_read_input_tokens: 72_848, cache_creation_input_tokens: 212 }
const START = { surface: 'terminal', isInteractive: true, cwd: '/work' }
const ASIDE = (args: string) => ({ command: 'aside', args, origin: { kind: 'composer' } })
const PANE = {
  plugin: 'aside',
  surface: 'terminal',
  component: 'Pane',
  requestId: 'aside',
  props: { title: 'aside', isFocused: true, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 30 } },
} as const

type Usage = typeof USAGE
type Fork = { text: string; usage: Usage } | null
type Message = { role: 'user' | 'assistant'; text: string; toolUses: never[] }
type Setup = {
  fork?: (prompt: string) => Fork | Promise<Fork>
  messages?: () => Message[]
  complete?: (request: { model: string; prompt: string; system?: string }) => string
}

/** Answers every verb the mod may use and records the calls; any other verb fails the test. */
function world(on: any, setup: Setup = {}) {
  mock.clock(on)
  const w = {
    verbs: [] as string[],
    registered: [] as unknown[],
    opened: [] as unknown[],
    closed: [] as unknown[],
    invalidated: 0,
    forks: [] as string[],
    completes: [] as { model: string; prompt: string; system?: string }[],
    core: [] as string[],
  }
  const seen = (verb: string) => w.verbs.push(verb)

  on('session.start', (_$: any, e: any) => ({ cwd: e.cwd }))
  on('command.register', (_$: any, e: any) => {
    seen('command.register')
    w.registered.push({ name: e.name, description: e.description, argumentHint: e.argumentHint, immediate: e.immediate })
    return { value: { command: e.name } }
  })
  on('command.run', () => {
    w.core.push('command.run')
    return { text: 'core ran' }
  })
  on('turn.complete', (_$: any, e: any) => {
    w.core.push('turn.complete')
    return { text: e.answer }
  })
  on('model.fork', async (_$: any, e: any) => {
    seen('model.fork')
    w.forks.push(e.prompt)
    return { value: setup.fork ? await setup.fork(e.prompt) : null }
  })
  on('model.complete', (_$: any, e: any) => {
    seen('model.complete')
    w.completes.push({ model: e.model, prompt: e.prompt, system: e.system })
    return { value: setup.complete ? setup.complete(e) : 'live answer' }
  })
  on('session.messages', () => {
    seen('session.messages')
    return { value: setup.messages ? setup.messages() : [] }
  })
  on('ui.open', (_$: any, e: any) => {
    seen('ui.open')
    w.opened.push({ id: e.id, title: e.title, focus: e.focus })
    return { value: undefined }
  })
  on('ui.close', (_$: any, e: any) => {
    seen('ui.close')
    w.closed.push({ id: e.id })
    return { value: undefined }
  })
  on('ui.invalidate', () => {
    seen('ui.invalidate')
    w.invalidated += 1
    return { value: undefined }
  })
  on('ui.input', (_$: any, e: any) => {
    w.core.push('ui.input')
    return { element: e.element, value: e.value }
  })
  on('ui.press', (_$: any, e: any) => {
    w.core.push('ui.press')
    return { element: e.element }
  })
  on('ui.render', { component: 'Pane' }, ($: any, e: any) => {
    w.core.push('ui.render')
    const { Text } = $.ui.resolve(e)
    return Text({ children: 'core pane' })
  })
  return w
}

/** Lets the un-awaited fork chain settle. */
const settle = async () => {
  for (let i = 0; i < 4; i++) await new Promise(done => (globalThis as any).setTimeout(done, 2))
}

const drawn = async ($: any) => {
  const ui = await $.ui.mount(PANE)
  const texts: string[] = []
  const walk = (node: any): void => {
    if (node === null || node === undefined || typeof node === 'boolean' || typeof node === 'number') return
    if (typeof node === 'string') { texts.push(node); return }
    if (Array.isArray(node)) { node.forEach(walk); return }
    walk(node.children)
  }
  walk(await ui.drawn())
  await ui.unmount()
  return texts
}

const has = async ($: any, text: RegExp) => (await drawn($)).some(t => text.test(t))

const ask = async ($: any, question: string) => {
  const ui = await $.ui.mount(PANE)
  const result = await ui.input({ key: 'q', text: question })
  await ui.unmount()
  await settle()
  return result
}

test('session.start registers /aside as an immediate command', async ($, on) => {
  const w = world(on)
  await $.session.start(START)
  expect(w.registered).toEqual([
    { name: 'aside', description: 'Read-only side chat about this session (opens a pane; Tab focuses its input)', argumentHint: '[question]', immediate: true },
  ])
})

test('the module only ever reads and draws: no fs, process, http, store, tool or prompt verbs', async ($, on) => {
  // Any verb the world does not answer fails the call, so this also proves nothing else is reached.
  const w = world(on, { fork: () => ({ text: 'A', usage: USAGE }) })
  await $.session.start(START)
  await $.command.run(ASIDE('q'))
  await settle()
  const ui = await $.ui.mount(PANE)
  await ui.press({ key: 'close' })
  await ui.unmount()
  const allowed = ['command.register', 'model.complete', 'model.fork', 'session.messages', 'ui.close', 'ui.invalidate', 'ui.open', 'ui.resolve']
  for (const verb of new Set(w.verbs)) expect(allowed).toContain(verb)
})

test('/aside opens the pane focused, answers with a fork, and puts no text in the transcript', async ($, on) => {
  let release!: (value: Fork) => void
  const reply = new Promise<Fork>(done => { release = done })
  const w = world(on, { fork: () => reply })
  await $.session.start(START)

  const result = await $.command.run(ASIDE('what did I ask?'))
  expect(result).toEqual({}) // a { text } answer would land in the transcript as user messages
  expect(w.core).not.toContain('command.run') // the hook answers; the core does not run
  expect(w.opened).toEqual([{ id: 'aside', title: 'aside', focus: true }])
  expect(await has($, /^1 question · 1 pending$/)).toBe(true)
  expect(await has($, /^you: what did I ask\?$/)).toBe(true)
  expect(await has($, /^aside: thinking…$/)).toBe(true)

  release({ text: 'You asked about 2+2.', usage: USAGE })
  await settle()

  expect(w.forks).toHaveLength(1)
  expect(w.forks[0]).toMatch(/read-only side question/)
  expect(w.forks[0]).toMatch(/Side question: what did I ask\?$/)
  expect(w.forks[0]).not.toMatch(/Earlier side questions/)
  expect(await has($, /^1 question$/)).toBe(true)
  expect(await has($, /^aside: You asked about 2\+2\.$/)).toBe(true)
  expect(await has($, /^fork · \S+ ms · read 72848 · new 242 · out 100$/)).toBe(true)
  expect(w.invalidated).toBeGreaterThanOrEqual(2) // when asked and when answered
})

test('/aside with no question only opens the pane', async ($, on) => {
  const w = world(on)
  await $.session.start(START)
  await $.command.run(ASIDE('   '))
  await settle()
  expect(w.forks).toHaveLength(0)
  expect(await has($, /Ask about the session so far\. Read-only/)).toBe(true)
})

test('threads its own history into the next question', async ($, on) => {
  let n = 0
  const w = world(on, { fork: () => ({ text: `answer ${++n}`, usage: USAGE }) })
  await $.session.start(START)
  await $.command.run(ASIDE('first?'))
  await settle()
  await ask($, 'second?')
  expect(w.forks).toHaveLength(2)
  expect(w.forks[1]).toMatch(/Earlier side questions and their answers:\n\nQ: first\?\nA: answer 1\n\nSide question: second\?$/)
  expect(await has($, /^2 questions$/)).toBe(true)
})

test('caps the history carried in a prompt at maxHistory and the answer at MAX_CHARS_PER_ANSWER', { options: { maxHistory: 2 } }, async ($, on) => {
  const w = world(on, { fork: () => ({ text: 'x'.repeat(5000), usage: USAGE }) })
  await $.session.start(START)
  for (const q of ['a', 'b', 'c', 'd']) await ask($, q)
  const last = w.forks[3]!
  expect(last).not.toMatch(/Q: a\n/)
  expect(last).toMatch(/Q: b\n/)
  expect(last).toMatch(/Q: c\n/)
  const answers = (await drawn($)).filter(t => t.startsWith('aside: x'))
  expect(answers.length).toBeGreaterThan(0)
  // clipped with an ellipsis
  for (const a of answers) expect(a.length).toBe('aside: '.length + MAX_CHARS_PER_ANSWER + 1)
})

test('a submit is answered in the hook itself, never through the core', async ($, on) => {
  const w = world(on, { fork: () => ({ text: 'ok', usage: USAGE }) })
  await $.session.start(START)
  const ui = await $.ui.mount(PANE)
  const result = await ui.input({ key: 'q', text: 'why?' })
  await ui.unmount()
  await settle()
  expect(result).toEqual({ element: 'q', value: 'why?' })
  expect(w.core).not.toContain('ui.input') // the redraw race would drop a submit that reached the core
  expect(w.forks).toHaveLength(1)
})

test('a change passes through untouched', async ($, on) => {
  const w = world(on)
  await $.session.start(START)
  const ui = await $.ui.mount(PANE)
  const result = await ui.input({ key: 'q', text: 'wh', kind: 'change' })
  await ui.unmount()
  await settle()
  expect(w.core).toContain('ui.input')
  expect(result).toEqual({ element: 'q', value: 'wh' })
  expect(w.forks).toHaveLength(0)
})

test('an empty submit asks nothing', async ($, on) => {
  const w = world(on)
  await $.session.start(START)
  await ask($, '   ')
  expect(w.forks).toHaveLength(0)
})

test('Clear empties the history and Close closes the pane', async ($, on) => {
  const w = world(on, { fork: () => ({ text: 'ok', usage: USAGE }) })
  await $.session.start(START)
  await ask($, 'q')
  const ui = await $.ui.mount(PANE)
  expect(await ui.press({ key: 'clear' })).toEqual({ element: 'clear' })
  await ui.redraw()
  expect(await ui.find({ type: 'Text', text: /Ask about the session so far/ })).toBeDefined()
  expect(await ui.press({ key: 'close' })).toEqual({ element: 'close' })
  await ui.unmount()
  await settle()
  expect(w.closed).toEqual([{ id: 'aside' }])
  expect(w.core).not.toContain('ui.press')
})

test('draws the input, the two buttons and every exchange', async ($, on) => {
  world(on, { fork: () => ({ text: 'A', usage: USAGE }) })
  await $.session.start(START)
  await ask($, 'Q')
  const ui = await $.ui.mount(PANE)
  expect(await ui.find({ key: 'q' })).toBeDefined()
  expect(await ui.find({ key: 'clear', text: 'Clear' })).toBeDefined()
  expect(await ui.find({ key: 'close', text: 'Close' })).toBeDefined()
  await ui.unmount()
  expect((await drawn($)).slice(0, 3)).toEqual(['1 question', 'you: Q', 'aside: A'])
})

test('leaves other panes to their owners', async ($, on) => {
  const w = world(on)
  await $.session.start(START)
  const ui = await $.ui.mount({ ...PANE, requestId: 'diff' })
  expect(await ui.find({ type: 'Text', text: 'core pane' })).toBeDefined()
  expect(w.core).toContain('ui.render')
  await ui.unmount()
})

const transcript = (): Message[] => [
  { role: 'user', text: 'Count to 1500.', toolUses: [] },
  { role: 'assistant', text: '', toolUses: [] },
]

test('while a turn is running, liveFallback (default on) answers from session.messages through model.complete', async ($, on) => {
  const w = world(on, { fork: () => null, messages: transcript, complete: () => 'They asked for a count.' })
  await $.session.start(START)
  await $.command.run(ASIDE('what is asked?'))
  await settle()
  expect(w.completes).toHaveLength(1)
  expect(w.completes[0]!.model).toBe('haiku')
  expect(w.completes[0]!.system).toMatch(/No tools/)
  expect(w.completes[0]!.prompt).toMatch(/^Transcript so far:\n\nUSER: Count to 1500\.\n\nASSISTANT: \n\n/)
  expect(w.completes[0]!.prompt).toMatch(/Side question: what is asked\?$/)
  expect(await has($, /^aside: They asked for a count\.$/)).toBe(true)
  expect(await has($, /^live · \S+ ms · 33 chars of transcript sent uncached$/)).toBe(true)
})

test('liveModel is honoured', { options: { liveModel: 'sonnet' } }, async ($, on) => {
  const w = world(on, { fork: () => null, messages: transcript, complete: () => 'x' })
  await $.session.start(START)
  await ask($, 'q')
  expect(w.completes[0]!.model).toBe('sonnet')
})

test('an empty transcript is said so, without a completion', async ($, on) => {
  const w = world(on, { fork: () => null, messages: () => [] })
  await $.session.start(START)
  await ask($, 'q')
  expect(w.completes).toHaveLength(0)
  expect(await has($, /nothing to ask about yet/)).toBe(true)
})

test('liveFallback off: the question waits and a fork answers it at turn.complete', { options: { liveFallback: false } }, async ($, on) => {
  let warm = false
  const w = world(on, { fork: () => (warm ? { text: 'now answered', usage: USAGE } : null) })
  await $.session.start(START)
  await ask($, 'later?')
  expect(w.completes).toHaveLength(0)
  expect(await has($, /^aside: waiting for this turn to end…$/)).toBe(true)
  warm = true
  await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer', usage: { ...USAGE, model: 'claude-opus-5-5' } })
  await settle()
  expect(w.core).toContain('turn.complete') // turn.complete passes through
  expect(w.forks).toHaveLength(2)
  expect(await has($, /^aside: now answered$/)).toBe(true)
})

test('a failed fork shows an error row instead of throwing', async ($, on) => {
  // A test hook that throws is skipped, so the call finds no answer and fails with the engine's own message.
  world(on, { fork: () => { throw new Error('budget spent') } })
  await $.session.start(START)
  await ask($, 'q')
  expect(await has($, /^aside: \(no answer: .+\)$/)).toBe(true)
})

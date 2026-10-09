/** What the meter shows, refreshed on every `session.measure`. */
export type Meter = {
  /** This chat's cost in US dollars at API list prices (since the last /clear). */
  chatUsd: number
  /** Input tokens the last reply was answered over: what the next message re-sends. */
  tokens: number | null
  /** The model's context window in tokens. */
  window: number
  /** `tokens` over `window`, 0 to 100. */
  percent: number | null
  /** What the last finished reply cost, subagents included. */
  lastReplyUsd: number | null
  /** Replies finished in this chat. */
  replies: number
  /** Everything spent today, across every session on this machine. */
  todayUsd: number
  /** The fullest plan usage window, in percent, on a subscription. */
  planPercent: number | null
}

export type Level = 'ok' | 'warn' | 'urge'

/** What the last message added on its own, shown until the next one. */
export type Intake = {
  tokens: number
  reasons: string[]
}

/** A document this session turned into markdown. */
export type Converted = {
  source: string
  markdown: string
  tokens: number
}

/** One finished reply. */
export type Reply = {
  usd: number
  inputTokens: number
}

declare module 'claude-code' {
  interface PluginState {
    'cost-guard': {
      meter: Meter
      intake: Intake | null
      hiddenLevel: Level | null
      converted: Converted[]
      replies: Reply[]
      ledgerUsd: number
      chatBaseUsd: number
      turnStartUsd: number
      heldAtTokens: number
      redirected: string[]
    }
  }
}

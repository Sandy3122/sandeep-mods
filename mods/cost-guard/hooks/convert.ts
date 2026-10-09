/** Documents worth reading as markdown. HTML is left alone: it is usually code to edit. */
export const CONVERTIBLE = new Set(['pdf', 'docx', 'pptx', 'xlsx', 'xls', 'odt', 'odp', 'ods', 'rtf', 'epub'])

/** The first line of every copy this mod writes, so it never overwrites a file of yours. */
export const MARK = '<!-- cost-guard: markdown copy of '

const cut = (path: string) => Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))

export const baseName = (path: string) => path.slice(cut(path) + 1)

export const extensionOf = (path: string) => {
  const name = baseName(path)
  const dot = name.lastIndexOf('.')

  return dot <= 0 ? '' : name.slice(dot + 1).toLowerCase()
}

const PANDOC = new Set(['docx', 'odt', 'rtf', 'epub', 'pptx', 'xlsx'])

/** Every converter worth trying for a file, best first. */
export const convertersFor = (ext: string, path: string): string[][] => [
  ['markitdown', path],
  ['python3', '-m', 'markitdown', path],
  ['python', '-m', 'markitdown', path],
  ['py', '-m', 'markitdown', path],
  ...(PANDOC.has(ext) ? [['pandoc', path, '-t', 'gfm', '--wrap=none']] : []),
  ...(ext === 'pdf' ? [['pdftotext', '-layout', '-enc', 'UTF-8', path, '-']] : []),
]

/** A short, stable tag for a path, so copies of same-named files never collide. */
export const tagOf = (text: string) => {
  let hash = 5381

  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0
  }

  return hash.toString(36)
}

export type Markdown =
  | { isMade: true; path: string; tokens: number; isReused: boolean }
  | { isMade: false; why: 'no-converter' | 'scanned' | 'unwritable' }

/** A PDF whose text layer is next to empty is a scan: its pages say more than its text. */
export const isScanned = (text: string) => text.replace(/\s+/g, '').length < 300

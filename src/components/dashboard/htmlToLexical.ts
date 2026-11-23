type LexicalNode = {
  type: string
  version: number
  [key: string]: unknown
}

const FORMAT = {
  bold: 1,
  italic: 2,
  strike: 4,
  underline: 8,
  code: 16,
}

function textNode(text: string, format: number): LexicalNode {
  return { type: 'text', detail: 0, format, mode: 'normal', style: '', text, version: 1 }
}

function linebreak(): LexicalNode {
  return { type: 'linebreak', version: 1 }
}

function element(type: string, children: LexicalNode[], extra: Record<string, unknown> = {}): LexicalNode {
  return {
    type,
    children,
    direction: children.length ? 'ltr' : null,
    format: '',
    indent: 0,
    version: 1,
    ...extra,
  }
}

function safeUrl(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:') return trimmed
  } catch {
    return null
  }
  return null
}

function mergeText(nodes: LexicalNode[]): LexicalNode[] {
  const merged: LexicalNode[] = []
  for (const node of nodes) {
    const prev = merged[merged.length - 1]
    if (node.type === 'text' && prev?.type === 'text' && prev.format === node.format) {
      prev.text = `${prev.text ?? ''}${node.text ?? ''}`
      continue
    }
    merged.push(node)
  }
  return merged.filter((node) => node.type !== 'text' || String(node.text ?? '').length > 0)
}

function inlineFrom(node: Node, format: number): LexicalNode[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.replace(/\u00a0/g, ' ') ?? ''
    return text ? [textNode(text, format)] : []
  }
  if (!(node instanceof HTMLElement)) return []
  const tag = node.tagName
  if (tag === 'BR') return [linebreak()]
  let next = format
  if (tag === 'STRONG' || tag === 'B') next |= FORMAT.bold
  if (tag === 'EM' || tag === 'I') next |= FORMAT.italic
  if (tag === 'U') next |= FORMAT.underline
  if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') next |= FORMAT.strike
  if (tag === 'CODE') next |= FORMAT.code
  const style = node.getAttribute('style') ?? ''
  if (/font-weight:\s*(bold|[6-9]00)/i.test(style)) next |= FORMAT.bold
  if (/font-style:\s*italic/i.test(style)) next |= FORMAT.italic
  if (/text-decoration:[^;]*underline/i.test(style)) next |= FORMAT.underline
  if (/text-decoration:[^;]*line-through/i.test(style)) next |= FORMAT.strike

  if (tag === 'A') {
    const href = safeUrl(node.getAttribute('href') ?? '')
    const children = mergeText(Array.from(node.childNodes).flatMap((child) => inlineFrom(child, next)))
    if (!href) return children
    return [
      element('link', children.length ? children : [textNode(href, next)], {
        version: 3,
        fields: {
          linkType: 'custom',
          url: href,
          newTab: node.getAttribute('target') === '_blank',
          doc: null,
        },
      }),
    ]
  }

  return Array.from(node.childNodes).flatMap((child) => inlineFrom(child, next))
}

function paragraphFrom(node: HTMLElement, tag?: string): LexicalNode {
  const children = mergeText(Array.from(node.childNodes).flatMap((child) => inlineFrom(child, 0)))
  if (tag && /^H[1-6]$/.test(tag)) {
    return element('heading', children.length ? children : [textNode('', 0)], { tag: tag.toLowerCase() })
  }
  return element('paragraph', children.length ? children : [textNode('', 0)], { textFormat: 0, textStyle: '' })
}

function listFrom(node: HTMLElement): LexicalNode {
  const ordered = node.tagName === 'OL'
  const items = Array.from(node.children).filter((child) => child.tagName === 'LI')
  return element(
    'list',
    items.map((item, index) => {
      const nested = Array.from(item.children).filter((child) => child.tagName === 'UL' || child.tagName === 'OL')
      const clone = item.cloneNode(true) as HTMLElement
      clone.querySelectorAll('ul, ol').forEach((list) => list.remove())
      const children = [
        ...mergeText(Array.from(clone.childNodes).flatMap((child) => inlineFrom(child, 0))),
        ...nested.flatMap((list) => (list instanceof HTMLElement ? [listFrom(list)] : [])),
      ]
      return element('listitem', children.length ? children : [textNode('', 0)], { value: index + 1 })
    }),
    { listType: ordered ? 'number' : 'bullet', start: 1, tag: ordered ? 'ol' : 'ul' },
  )
}

function blocksFrom(parent: ParentNode): LexicalNode[] {
  const blocks: LexicalNode[] = []
  for (const node of Array.from(parent.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent?.trim()) blocks.push(element('paragraph', [textNode(node.textContent, 0)], { textFormat: 0, textStyle: '' }))
      continue
    }
    if (!(node instanceof HTMLElement)) continue
    const tag = node.tagName
    if (tag === 'UL' || tag === 'OL') {
      blocks.push(listFrom(node))
      continue
    }
    if (/^H[1-6]$/.test(tag)) {
      blocks.push(paragraphFrom(node, tag))
      continue
    }
    if (tag === 'DIV' || tag === 'BLOCKQUOTE' || tag === 'SECTION' || tag === 'ARTICLE') {
      const hasBlock = Array.from(node.children).some((child) => /^(P|DIV|UL|OL|H[1-6]|BLOCKQUOTE)$/.test(child.tagName))
      if (hasBlock) blocks.push(...blocksFrom(node))
      else blocks.push(paragraphFrom(node))
      continue
    }
    if (tag === 'P') {
      blocks.push(paragraphFrom(node))
      continue
    }
    if (tag === 'BR') continue
    blocks.push(paragraphFrom(node))
  }
  return blocks.filter((block) => {
    if (block.type !== 'paragraph' && block.type !== 'heading') return true
    const children = block.children as LexicalNode[] | undefined
    return Boolean(children?.some((child) => child.type !== 'text' || String(child.text ?? '').trim()))
  })
}

export function htmlToLexical(html: string): { root: LexicalNode } | null {
  const trimmed = html.replace(/&nbsp;/g, ' ').trim()
  if (!trimmed || trimmed === '<br>' || trimmed === '<p><br></p>' || trimmed === '<div><br></div>') return null
  const doc = new DOMParser().parseFromString(trimmed, 'text/html')
  const children = blocksFrom(doc.body)
  if (children.length === 0) return null
  return {
    root: {
      type: 'root',
      children,
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  }
}

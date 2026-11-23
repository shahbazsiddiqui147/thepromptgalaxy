import 'server-only'

import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html'
import type { Prompt } from '@/payload-types'

export type ArticleBody = NonNullable<NonNullable<Prompt['article']>['body']>

export function articleToHtml(body: ArticleBody | null | undefined): string {
  if (!body?.root) return ''
  try {
    return convertLexicalToHTML({
      data: body,
      disableContainer: true,
    })
  } catch {
    return ''
  }
}

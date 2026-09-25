import { getPool } from '@/db/pool'
import { getStyleMatrix, getToolMatrix } from '@/matrix/repo'
import { similarCandidates } from '@/prompts/repo'
import type { FormOptions } from './PromptForm'

export async function loadFormOptions(excludeId: number | null): Promise<FormOptions> {
  const db = getPool()
  const [toolMatrix, styleMatrix, similar] = await Promise.all([getToolMatrix(db), getStyleMatrix(db), similarCandidates(db, excludeId)])
  return {
    categories: toolMatrix.categories,
    tools: toolMatrix.tools,
    styles: styleMatrix.styles,
    toolLinks: toolMatrix.links.map((l) => ({ categoryId: l.categoryId, toolId: l.toolId })),
    styleLinks: styleMatrix.links.map((l) => ({ categoryId: l.categoryId, styleId: l.styleId })),
    similar,
  }
}

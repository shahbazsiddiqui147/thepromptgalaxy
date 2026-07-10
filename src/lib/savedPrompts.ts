import type { Customer } from '@/payload-types'

// Payload's JWT auth strategy populates relationship fields to
// `config.defaultDepth` (2 by default, and this project doesn't override it)
// rather than depth 0, so `customer.savedPrompts` can come back as an array
// of populated Prompt objects instead of raw numeric IDs depending on the
// call site. Normalize both shapes into plain numeric IDs so callers never
// have to care which one they got.
export function extractSavedPromptIds(savedPrompts: Customer['savedPrompts']): number[] {
  if (!savedPrompts) return []
  return savedPrompts.map((entry) => (typeof entry === 'object' && entry !== null ? entry.id : entry))
}
